# 範本；實例在各專案 _notes/tools/；實例改進不自動回灌，owner 逐次裁。
# doc_check — `_notes` 文件體檢機（收尾跑一次）
# 各專案的設計決策（哪條規則 → 哪個檢查 → 對照組怎麼配）產出落點＝ _notes/plans/doc-check-tool.md
# 本檔只放「怎麼做」；規則本體住 skill keeping-notes-clean（通用）＋ filing.md／conventions.md／learnings.md（本專案細則）。
#
# 用法：
#   python doc_check.py check [--full] [--plan plans/phase-N.md]
#   python doc_check.py snapshot          # owner 放行後手動跑，更新增量 baseline
#   python doc_check.py backup <輪名>     # 備份活檔到 _backup/ 並 diff 驗逐字
#   python doc_check.py moved <來源> <目的地>   # 搬運逐行驗收
#   python doc_check.py align <commit> --plan plans/<檔>.md [--plan …]   # commit 收尾：未結案 plan 裡指向本 commit 改動檔的行號是否已加對齊註記（不帶 --plan＝全掃）
#
# exit：2 對照組死（整份不可信）＞ 1 A 類失敗 ＞ 3 無失敗但有檢查被跳過 ＞ 0
import argparse
import datetime as _dt
import filecmp
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# ════════════════════════════════════════════════════════════════
# 【第 1 層】換專案／換機器**必須**逐項對過的三項——照範本開新檔時只有這裡非改不可
#   ① MEMORY_DIR ② GLOBAL_CLAUDE_MD ③ ACTIVE_REL
#   （其餘常數＝規則關鍵字，見第 2 層：本專案規則沒變就別動）
# ════════════════════════════════════════════════════════════════
MEMORY_DIR = Path(r"C:\Users\Mochi122\.claude\projects\h--GGL3-Launcher\memory")
GLOBAL_CLAUDE_MD = Path(r"C:\Users\Mochi122\.claude\CLAUDE.md")   # 行內寫「全域」時的 CLAUDE.md

# 活檔（收尾掃描對象）；已收 phase plans／handoff／reviews／_backup／history* 不在此
ACTIVE_REL = [
    "STATUS.md", "conventions.md", "learnings.md", "filing.md",
    "future-work.md",
]

# ── 路徑（自動推導，不用改）──
TOOLS_DIR = Path(__file__).resolve().parent
NOTES = TOOLS_DIR.parent                       # _notes/
PROJECT_ROOT = NOTES.parent
SNAPSHOT_DIR = TOOLS_DIR / ".snapshot"
BACKUP_DIR = NOTES / "_backup"
CLAUDE_MD = PROJECT_ROOT / "CLAUDE.md"

# ════════════════════════════════════════════════════════════════
# 【第 2 層】規則關鍵字：每個常數＝某條文件規則的機器形狀
#   規則本體不在這裡（住 skill keeping-notes-clean／filing.md／conventions.md／learnings.md）；
#   行尾註解是門牌。**本專案規則改了才動這區，換專案不必逐項改。**
# ════════════════════════════════════════════════════════════════
HISTORICAL_TAGS = ("〔③", "〔現查")   # 紀錄型標記（唯一的家）：斷鏈／⏳ 降絆線；A14 要求其帶日期
FROZEN_HISTORY = ["history.md", "history-extra.md"]   # 只跑 filing §一 絆線
ALIGN_TAG = "〔對齊"                                     # filing §本專案細則「行號對齊」；align 子命令認這個＋commit hash
ALIGN_SKIP = {"doc-check-tool.md"}                       # align 不掃：本工具的設計檔，裡面的 檔:行 是被討論的例子，不是指向程式的地址
EXCLUDE_DIRS = {"_backup", ".snapshot", "tools"}   # 只用於斷鏈解析的目標索引；reviews 是合法目標（STATUS 依 SPR 指向 review 檔），掃描範圍由 active_files／dup_corpus 的白名單決定，本就不含 reviews

STATUS_FILE = "STATUS.md"
STATUS_MAX_BYTES = 2560                                   # filing S6
STATUS_LABELS = ["未結案", "接續步驟", "卡住", "上一輪 retro"]   # filing S7
STUCK_VALUES = {"否", "🔴 正在擋", "⏸️ 已跳過、未解"}
CELL_MAX_CHARS = 100                                      # filing S4（字元，非 byte）
STATUS_SELF_REF = ["不複述", "見上方", "見下方"]           # filing S1

LEARNINGS_FILE = "learnings.md"
EVIDENCE_MARK = "證據："                                  # filing L2 證據列
PROMOTED_MARK = "〔已晉升"
STAY_MARK = "〔留專案層"                                  # owner 裁留專案層 ⇒ A8 不再問
REUSE_MARK = "沿用"                                       # n＝2 計數不計
FILING_FILE = "filing.md"
INBOX_FILE = "future-work.md"
F_BLOCK_MAX_OPEN = 5                                      # filing 3-2

HISTORY_TRIP = ["規則", "以後", "下次", "一律", "落法", "應驗", "同族", "第 N 次", "判準"]  # filing §一
QUANTIFIERS = ["唯一", "只有", "全部", "恰"]               # learnings §一 全稱詞
AUTHORITY_TAG = "唯一權威"
SWITCH_FILE_WORDS = ["我學到", "下次要", "這是第 N 次", "應驗"]   # learnings §四
WHY_WORDS = ["為什麼當初", "立法背景", "原話"]             # learnings §八
DELEGATE_ANCHORS = ["家＝", "唯一權威＝", "本體＝"]          # 批 5-3 委託
DUP_MIN_CHARS = 12                                        # A15 副本 probe 行最短長度
CHANNEL_PROBE = "# "                                      # 通道對照：每個筆記檔第一行 `# 標題`，骨架保證存在；只證 grep 通道，不綁內容

# ════════════════════════════════════════════════════════════════

GREP = os.environ.get("DOC_CHECK_GREP") or shutil.which("grep") or r"C:\Program Files\Git\usr\bin\grep.exe"
DATE_RE = re.compile(r"20[0-9][0-9]-")
LINE_PTR_RE = re.compile(r"[\w\-]+\.md:[0-9]+|`:[0-9]+`")
SECTION_REF_RE = re.compile(r"`?([\w\-]+\.md)`?\s*§")


class Report:
    def __init__(self):
        self.fails, self.trips, self.infos, self.skips = [], [], [], []
        self.controls = []          # (name, actual)

    def fail(self, cid, msg): self.fails.append(f"[{cid}] {msg}")
    def trip(self, cid, msg): self.trips.append(f"[{cid}] {msg}")
    def info(self, cid, msg): self.infos.append(f"[{cid}] {msg}")
    def skip(self, cid, why): self.skips.append(f"[{cid}] 跳過：{why}")
    def control(self, name, actual): self.controls.append((name, actual))

    def exit_code(self):
        if any(a == 0 for _, a in self.controls): return 2
        if self.fails: return 1
        if self.skips: return 3
        return 0


# ---------- 基礎 ----------
def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def lines_of(p: Path):
    return read(p).splitlines()

def plan_path(plan: str) -> Path:
    """--plan 路徑計算的唯一的家：絕對路徑照用，否則相對 NOTES。"""
    return Path(plan) if os.path.isabs(plan) else NOTES / plan


def guard(rep, p: Path, cid: str, note: str = "") -> bool:
    """讀活檔前的缺檔守衛（唯一的家）：檔在 ⇒ True；不在 ⇒ 印跳過（exit 3）回 False。
    規格＝缺檔跳過、不炸、不靜默略過。**直接組路徑讀檔的檢查一律先過這關**——
    active_files() 的守衛只保護走 files 清單的檢查，繞過它的自己讀就沒人擋。"""
    if p.exists(): return True
    rep.skip(cid, f"活檔不存在 {p}{note}")
    return False


def active_files(plans: list[str] | None, rep=None):
    """活檔清單；母數裡缺檔＝跳過（exit 3），不靜默略過"""
    fs = [NOTES / r for r in ACTIVE_REL]
    fs += [plan_path(p) for p in plans or []]              # --plan 可重複（argparse append）
    fs.append(CLAUDE_MD)
    if MEMORY_DIR.exists(): fs += sorted(MEMORY_DIR.glob("*.md"))
    elif rep: rep.skip("母數", f"memory 目錄不存在 {MEMORY_DIR}")
    out = []
    for f in fs:
        if f.exists(): out.append(f)
        elif rep: rep.skip("母數", f"活檔不存在 {f}")
    return out

def dup_corpus():
    """conventions §🔍 母數：專案 CLAUDE.md ＋ _notes/*.md ＋ plans/*.md ＋ memory；排 reviews／_backup"""
    out = [CLAUDE_MD] if CLAUDE_MD.exists() else []
    out += sorted(NOTES.glob("*.md")) + sorted((NOTES / "plans").glob("*.md"))
    if MEMORY_DIR.exists(): out += sorted(MEMORY_DIR.glob("*.md"))
    return out

def all_md_by_name():
    """斷鏈解析用：basename → Path（_notes 遞迴 + 專案根目錄的 md（CLAUDE.md、ARCHITECTURE.md…）+ memory）"""
    m = {}
    for p in NOTES.rglob("*.md"):
        if EXCLUDE_DIRS & set(p.relative_to(NOTES).parts): continue
        m.setdefault(p.name, p)
    for p in PROJECT_ROOT.glob("*.md"): m.setdefault(p.name, p)
    if MEMORY_DIR.exists():
        for p in MEMORY_DIR.glob("*.md"): m.setdefault(p.name, p)
    return m

def rel(p: Path) -> str:
    try: return str(p.relative_to(NOTES)).replace("\\", "/")
    except ValueError: return str(p)

def grep_count(pattern: str, files, fixed=True) -> int:
    """對照組專用：走 Bash grep（與 Python 主檢查不同引擎）。回傳總命中行數。"""
    total = 0
    for f in files:
        args = [GREP, "-c", "-F" if fixed else "-E", "--", pattern, str(f)]
        try:
            r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
        except OSError:
            return 0            # grep 不存在／跑不起來＝通道死，讓對照組回 0 觸發 exit 2
        if r.returncode in (0, 1) and r.stdout.strip().isdigit():
            total += int(r.stdout.strip())
    return total

def channel(rep, cid, files):
    """通道對照：對主檢查實際掃的檔 grep 骨架保證存在的 `# `。0 ⇒ 通道死 ⇒ exit 2。"""
    fs = [f for f in files if f.exists()]
    rep.control(f"{cid} 通道 grep '# ' >0", grep_count(CHANNEL_PROBE, fs) if fs else 0)

def marker(rep, cid, mark, files, fixed=True):
    """母數對照：主檢查認的標記在檔內命中幾次。0 ≠ 通道死——列資訊給人判：本輪無此類條目（新專案正常），或常數區寫法沒對到檔內。"""
    fs = [f for f in files if f.exists()]
    n = grep_count(mark, fs, fixed) if fs else 0
    rep.info(cid, f"母數 {mark!r} 命中 {n}" + ("" if n else "——零命中：本輪無此類條目（新專案正常），或常數區寫法沒對到檔內；此項主檢查等於沒驗到東西"))


def clip(s: str, n=110) -> str:
    return s if len(s) <= n else s[:n] + "…"


# ---------- A 類檢查 ----------
def check_status(rep, files):
    p = NOTES / STATUS_FILE
    if not guard(rep, p, "A1-A4"): return
    size = len(read(p).encode("utf-8"))
    if size > STATUS_MAX_BYTES: rep.fail("A1", f"STATUS {size} bytes > {STATUS_MAX_BYTES}")
    rep.info("A1", f"STATUS {size}/{STATUS_MAX_BYTES} bytes")
    rep.control("A1 wc -c STATUS >0", grep_count("", [p]))

    rows = [l for l in lines_of(p) if l.startswith("|")]
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    labels = [c[0] for c in cells]
    if labels != STATUS_LABELS:
        rep.fail("A2", f"四欄標籤不符：{labels}")
    for c in cells:
        if c[0] == "卡住" and len(c) > 1 and c[1] not in STUCK_VALUES:
            rep.fail("A2", f"「卡住」值域外：{c[1]!r}")
    rep.info("A2", f"表格列數 {len(rows)}/4")
    channel(rep, "A2", [p])

    for r in rows:
        for c in r.strip().strip("|").split("|"):
            c = c.strip()
            if len(c) > CELL_MAX_CHARS or "<br>" in c:
                rep.fail("A3", f"單格 {len(c)} 字元／含 <br>：{clip(c)}")
    channel(rep, "A3", [p])

    for i, l in enumerate(lines_of(p), 1):
        for w in STATUS_SELF_REF:
            if w in l: rep.fail("A4", f"STATUS:{i} 含「{w}」")
    channel(rep, "A4", [p])


def learnings_entries():
    """learnings 條目清單；檔不存在 ⇒ 回空清單（跳過訊息由呼叫端的 guard 印，這裡沒有 rep）。"""
    p = NOTES / LEARNINGS_FILE
    if not p.exists(): return []
    out, in_body = [], False
    for i, l in enumerate(lines_of(p), 1):
        if l.startswith("## "): in_body = True
        if in_body and l.startswith("- "): out.append((i, l))
    return out


def check_learnings(rep, files):
    p = NOTES / LEARNINGS_FILE
    if not guard(rep, p, "A5-A8"): return
    entries = learnings_entries()
    for i, l in entries:
        if EVIDENCE_MARK not in l: rep.fail("A5", f"learnings:{i} 無證據列：{clip(l)}")
        body = l[2:].lstrip("⏳ ").strip()
        if not body.startswith("**") or body.startswith("****"):
            rep.fail("A6", f"learnings:{i} 首句非粗體：{clip(l)}")
    rep.info("A5/A6", f"條目 {len(entries)}")
    channel(rep, "A5/A6", [p]); marker(rep, "A5", EVIDENCE_MARK, [p])

    ask = []
    for i, l in entries:
        if PROMOTED_MARK in l or STAY_MARK in l or EVIDENCE_MARK not in l: continue
        ev = l[l.index(EVIDENCE_MARK):].replace("（番外）", "")
        ev = ev.split("：", 1)[1] if "：" in ev else ev
        items = [x.strip() for x in ev.split("、") if x.strip() and REUSE_MARK not in x]
        if len(items) >= 2: ask.append((i, len(items), l[:40]))
    for i, n, head in ask: rep.info("A8", f"learnings:{i} 證據 n＝{n} ⇒ 該問 owner 處置：{clip(head, 40)}")
    rep.info("A8", f"達 n≥2 且未標晉升：{len(ask)}/{len(entries)}")
    marker(rep, "A8", REUSE_MARK, [p])


def check_exits(rep, files):
    for f in files:
        for i, l in enumerate(lines_of(f), 1):
            if ("⏳" in l or "〔④" in l) and "出口" not in l and not any(t in l for t in HISTORICAL_TAGS):
                rep.fail("A7", f"{rel(f)}:{i} 未決無出口：{clip(l)}")
    channel(rep, "A7", files); marker(rep, "A7", "出口", files)


def headings_of(p: Path):
    return [l.lstrip("#").strip() for l in lines_of(p) if l.startswith("#")]


def resolve_section(target: Path, name: str):
    """節名式門牌 → 標題。回傳命中前綴長度（≥1）或 0。
    三層：① 全名逐步縮短（≥2 字）② 第一個空白前的 token（如 二／📝／A-1）
    ③ token 去掉 -N 尾巴（附錄子項 A-1 → 標題 A.）"""
    name = re.split(r"[）」「〕,、。；（／|*`]", name)[0].strip()[:16]   # 先切標點，再拆「・」
    parent, child = (name.split("・", 1) + [""])[:2] if "・" in name else ("", name)
    heads = headings_of(target)
    name = child.strip() or parent.strip()
    tok = name.split()[0] if name.split() else ""
    for t in dict.fromkeys([tok, tok.split("-")[0]]):      # 先試 token 精確命中（二／A-1／📝）
        if t and any(h.startswith(t) and (len(h) == len(t) or h[len(t)] in "、. 　") for h in heads):
            return 99
    for cand in ([child, parent] if parent else [child]):  # 再試全名逐步縮短
        cand = cand.strip()[:12]
        for n in range(len(cand), 1, -1):
            if any(cand[:n] in h for h in heads): return n
    return 0


def code_fence_mask(lines):
    """回傳每行是否在 ``` 圍欄內（範例表不算門牌）"""
    out, inside = [], False
    for l in lines:
        if l.strip().startswith("```"): inside = not inside; out.append(True); continue
        out.append(inside)
    return out


def check_links(rep, files):
    by_name = all_md_by_name()
    broken = 0
    for f in files:
        ls = lines_of(f); fence = code_fence_mask(ls)
        for i, l in enumerate(ls, 1):
            if fence[i - 1]: continue
            for m in SECTION_REF_RE.finditer(l):
                fname = m.group(1)
                tail = l[m.end():].strip()
                tag = "A10" if any(a in l for a in DELEGATE_ANCHORS) else "A9"
                kind = "委託" if tag == "A10" else "引用"
                hist = any(t in l for t in HISTORICAL_TAGS)
                emit = rep.trip if hist else rep.fail          # ③ 紀錄型 ⇒ 絆線人判
                note = "（③ 紀錄型，人判）" if hist else ""
                tgts = [by_name.get(fname)]
                if fname == CLAUDE_MD.name and "全域" in l: tgts = [GLOBAL_CLAUDE_MD]
                tgts = [t for t in tgts if t and t.exists()]
                if not tgts:
                    emit(tag, f"{rel(f)}:{i} {kind} 指向不存在的檔 {fname}{note}"); broken += not hist; continue
                n = max(resolve_section(t, tail) for t in tgts)
                if n == 0:
                    emit(tag, f"{rel(f)}:{i} {kind} 疑似斷鏈 {fname} §{clip(tail, 20)}{note}"); broken += not hist
                elif n < 3:
                    rep.trip(tag, f"{rel(f)}:{i} 只對到 {n} 字前綴 {fname} §{clip(tail, 20)}")
    rep.info("A9/A10", f"疑似斷鏈 {broken}")
    channel(rep, "A9/A10", files); marker(rep, "A9", "§", files); marker(rep, "A10", "家＝", files)


def check_line_pointers(rep, files):
    n = 0
    for f in files:
        for i, l in enumerate(lines_of(f), 1):
            if LINE_PTR_RE.search(l):
                n += 1; rep.trip("A11", f"{rel(f)}:{i} 行號門牌（活地址／紀錄型／論述對象 人判）：{clip(l, 90)}")
    rep.info("A11", f"活檔行號門牌 {n} 處")
    hs = [NOTES / h for h in FROZEN_HISTORY]
    channel(rep, "A11", hs); marker(rep, "A11", r"\.md:[0-9]+", hs, fixed=False)


def check_f_blocks(rep, files):
    p = NOTES / FILING_FILE
    if not guard(rep, p, "A12", "（分類失敗條目無家；bootstrap 應生此檔）"): return
    blocks, cur = [], None
    for l in lines_of(p):
        if l.startswith("### F-"): cur = [l]; blocks.append(cur)
        elif l.startswith("## ") or l.startswith("### "): cur = None
        elif cur is not None: cur.append(l)
    open_n = 0
    for b in blocks:
        text = "\n".join(b)
        if "已了結" not in text: open_n += 1
        if "出口" not in text: rep.fail("A12", f"{b[0][:30]} 無出口")
    if open_n >= F_BLOCK_MAX_OPEN: rep.fail("A12", f"§四 開著的條目 {open_n} ≥ {F_BLOCK_MAX_OPEN} ⇒ 分家")
    rep.info("A12", f"F- 區塊 {len(blocks)}，開著 {open_n}")
    channel(rep, "A12", [p]); marker(rep, "A12", "### F-", [p])


def check_history_trip(rep, full):
    hs = [NOTES / h for h in FROZEN_HISTORY if (NOTES / h).exists()]
    hits = []
    for h in hs:
        for i, l in enumerate(lines_of(h), 1):
            if any(w in l for w in HISTORY_TRIP): hits.append(f"{h.name}:{i} {clip(l, 80)}")
    rep.info("A13", f"history 絆線命中 {len(hits)} 行（命中≠錯；{'全列' if full else '列前 20，--full 全列'}）")
    for x in (hits if full else hits[:20]): rep.trip("A13", x)
    channel(rep, "A13", hs)


def check_dates(rep, files):
    for f in files:
        for i, l in enumerate(lines_of(f), 1):
            quoted = any("`" + t in l for t in HISTORICAL_TAGS)   # 規則原文引用標籤本身
            if any(t in l for t in HISTORICAL_TAGS) and not DATE_RE.search(l) and not quoted:
                rep.fail("A14", f"{rel(f)}:{i} ③／現查 無日期：{clip(l)}")
    channel(rep, "A14", files); marker(rep, "A14", "〔③", files)


def check_copy_fidelity(src: Path, dst: Path) -> bool:
    """A17 主檢查：備份與來源逐字相同（施工護欄 1 的機器形狀）。"""
    return filecmp.cmp(src, dst, shallow=False)


def check_differ_probe(src: Path, probe: Path) -> bool:
    """A17 對照組：來源＋1 byte 的探針必須被判為 differ。回 False ⇒ 比對通道死、整份不可信。"""
    probe.write_bytes(read(src).encode("utf-8") + b"x")
    detected = not filecmp.cmp(src, probe, shallow=False)
    probe.unlink()
    return detected


def check_lines_landed(src: Path, dst: Path):
    """A18 主檢查：來源每個非空行都要出現在目的地。回 (非空行數, [(行號, 內容)] 未落地)。"""
    dtext = read(dst)
    lines = [(i, l) for i, l in enumerate(lines_of(src), 1) if l.strip()]
    return len(lines), [(i, l) for i, l in lines if l not in dtext]


def check_first_line_control(src: Path, dst: Path) -> int:
    """A18 對照組：來源第一個非空行在目的地的命中數。0 ⇒ 通道死。"""
    first = next((l for l in lines_of(src) if l.strip()), "")
    return grep_count(first, [dst]) if first else 0


def check_git(rep):
    r = subprocess.run(["git", "status", "--porcelain"], cwd=PROJECT_ROOT, capture_output=True, text=True)
    if r.returncode != 0: rep.skip("A16", "git 不可用"); return
    if r.stdout.strip(): rep.fail("A16", f"git status 非空：\n{r.stdout.strip()}")
    n = subprocess.run(["git", "ls-files"], cwd=PROJECT_ROOT, capture_output=True, text=True).stdout.count("\n")
    rep.control("A16 git ls-files >0", n)


# ---------- 增量（快照）類：A15 副本 ＋ B1 全稱詞 ----------
def snap_path(f: Path) -> Path:
    return SNAPSHOT_DIR / (rel(f).replace("/", "__") if f.is_relative_to(NOTES) else "ext__" + f.name)

def normalize(l: str) -> str:
    return re.sub(r"^[\s\-\*#>|]+", "", l).replace("**", "").strip()

def new_lines(files, full):
    out = []
    for f in files:
        cur = lines_of(f)
        if full: base = set()
        else:
            sp = snap_path(f)
            if not sp.exists(): return None
            base = set(lines_of(sp))
        for i, l in enumerate(cur, 1):
            if l not in base: out.append((f, i, l))
    return out

def check_increment(rep, files, full):
    nl = new_lines(files, full)
    if nl is None:
        rep.skip("A15", "無快照 baseline（先跑 snapshot）"); rep.skip("B1", "無快照 baseline"); return
    rep.info("A15/B1", f"{'全掃' if full else '增量'} {len(nl)} 行")
    corpus = dup_corpus()
    texts = {c: read(c) for c in corpus}
    seen = set()
    for f, i, l in nl:
        line = normalize(l)
        if set(line) <= set("-|: "): continue
        # 整行＋逐句（。；：切）都當 probe：副本多半是句子級被抄，不是整行
        for key in dict.fromkeys([line] + [x.strip() for x in re.split(r"[。；：]", line)]):
            if len(key) < DUP_MIN_CHARS or key in seen: continue
            seen.add(key)
            hit = [c for c, t in texts.items() if key in t]
            if len(hit) > 1:
                rep.trip("A15", f"{rel(f)}:{i} 命中 {len(hit)} 檔 {[c.name for c in hit]}：{clip(key, 60)}")
        for q in QUANTIFIERS:
            if q in l:
                tag = "B1·唯一權威" if (q == "唯一" and AUTHORITY_TAG in l) else "B1"
                rep.trip(tag, f"{rel(f)}:{i} 「{q}」：{clip(l, 80)}")
    channel(rep, "A15", corpus)


# ---------- 其餘 B 類 ----------
def trip_inbox(rep):                       # B2 收集箱：已修條目該離箱
    if not guard(rep, NOTES / INBOX_FILE, "B2"): return
    for i, l in enumerate(lines_of(NOTES / INBOX_FILE), 1):
        if "✅ 已修" in l: rep.trip("B2", f"{INBOX_FILE}:{i} ✅ 已修 條目該離箱？：{clip(l, 80)}")


def trip_learnings(rep):                   # B3 計數敘事／B9 條目本體含日期
    for i, l in learnings_entries():
        if re.search(r"第 ?N 次|n＝[0-9]", l): rep.trip("B3", f"learnings:{i} 計數敘事：{clip(l, 80)}")
        body = l.split(EVIDENCE_MARK)[0]
        if DATE_RE.search(body): rep.trip("B9", f"learnings:{i} 條目本體含日期：{clip(l, 80)}")


def trip_switch_file(rep, files):          # B4 learnings 以外的活檔出現「該切檔」措辭
    for f in files:
        if f.name == LEARNINGS_FILE: continue
        for i, l in enumerate(lines_of(f), 1):
            if any(w in l for w in SWITCH_FILE_WORDS): rep.trip("B4", f"{rel(f)}:{i} 該切檔到 learnings？：{clip(l, 80)}")


def trip_plan_gate(rep, plans):            # B5 plan 檔頭前 30 行的 gate 狀態
    for plan in plans or []:
        pp = plan_path(plan)
        if not pp.exists():
            rep.skip("B5", f"活檔不存在 {pp}")          # 缺檔＝跳過（exit 3），不炸、不靜默略過
            continue
        for i, l in enumerate(lines_of(pp)[:30], 1):
            if re.search(r"gate|seal|✅ 過", l): rep.trip("B5", f"{pp.name}:{i} 檔頭 gate 狀態：{clip(l, 80)}")


def trip_why_words(rep):                   # B6 filing／learnings 正文混進「為什麼」
    for name in (FILING_FILE, LEARNINGS_FILE):
        if not guard(rep, NOTES / name, "B6"): continue
        for i, l in enumerate(lines_of(NOTES / name), 1):
            if any(w in l for w in WHY_WORDS): rep.trip("B6", f"{name}:{i} 正文出現「為什麼」類：{clip(l, 80)}")


def trip_decisions(rep, files):            # B7 ② 裁決缺日期或缺拍板者
    for f in files:
        for i, l in enumerate(lines_of(f), 1):
            if "〔②" in l and (not DATE_RE.search(l) or not ("owner" in l or "學長" in l)):
                rep.trip("B7", f"{rel(f)}:{i} ② 缺日期或缺拍板者：{clip(l, 80)}")


def trip_status(rep):                      # B8 STATUS 單格塞多句
    if not guard(rep, NOTES / STATUS_FILE, "B8"): return
    for l in lines_of(NOTES / STATUS_FILE):
        if l.startswith("|"):
            for c in l.strip("|").split("|"):
                if c.count("。") + c.count("；") >= 2: rep.trip("B8", f"STATUS 單格多句：{clip(c, 80)}")


def check_trips(rep, files, plans):
    """B 類絆線總入口。**呼叫順序＝輸出順序，改順序會改輸出，別動。**"""
    trip_inbox(rep)
    trip_learnings(rep)
    trip_switch_file(rep, files)
    trip_plan_gate(rep, plans)
    trip_why_words(rep)
    trip_decisions(rep, files)
    trip_status(rep)


# ---------- 輸出 ----------
# C 類人判清單：機器判不了、原樣印給人看（對到驗收單固定欄）。非母數常數，故住輸出區。
HUMAN_CHECKLIST = [
    "檔:行斷言落筆前，宿主方法整段讀過了嗎", "一句話裡有沒查證的半句 ⇒ 整句降級",
    "判「某規則被違反」前，該區塊整個讀完了嗎", "寫進權威檔的日期是一手來源嗎",
    "① 現況有沒有落值", "掛 ★唯一權威★ 的行有沒有藏會變的值", "S3 這欄會不會長出第二筆",
    "3-1 排除性裁決有沒有同時指定歸屬", "3-2 §四 是否連續三輪只進不出",
    "刪節前逐句驗家了嗎（上一輪 ✅ 不是通行證）", "我掃的是母數還是線索",
    "新定的判準舉得出一個會被它擋下的輸入嗎", "代號第一次出現有沒有說明",
    "plan 原子步驟逐條答了做了／故意跳／漏跳嗎", "「必做」的收益理由有沒有被哪段判死過",
    "owner 讀完新版檔案，知不知道這專案怎麼做事（只有 owner 能判）",
]


def print_report(rep: Report):
    def sec(t): print(f"\n=== {t} ===")
    sec("A 類失敗（exit 1）")
    for x in rep.fails or ["（無）"]: print("  " + x)
    sec("資訊（母數 x/y）")
    for x in rep.infos: print("  " + x)
    sec("B 類絆線（命中≠錯，要人看一眼；不影響 exit）")
    for x in rep.trips or ["（無）"]: print("  " + x)
    sec("跳過（exit 3）")
    for x in rep.skips or ["（無）"]: print("  " + x)
    sec("對照組（通道：每條期望 >0；任一＝0 ⇒ 通道死 exit 2。母數命中數在「資訊」段）")
    for n, a in rep.controls: print(f"  {'OK ' if a > 0 else 'DEAD'} {a:>6}  {n}")
    sec("人判清單（機器不管，驗收單固定欄）")
    for x in HUMAN_CHECKLIST: print("  ☐ " + x)
    code = rep.exit_code()
    print(f"\n=== exit {code}：{ {0:'全過',1:'有 A 類失敗',2:'對照組死，整份不可信',3:'無失敗但有檢查被跳過'}[code]} ===")
    return code


# ---------- 子命令 ----------
def cmd_check(a):
    rep = Report(); files = active_files(a.plan, rep)
    check_status(rep, files); check_learnings(rep, files); check_exits(rep, files)
    check_links(rep, files); check_line_pointers(rep, files); check_f_blocks(rep, files)
    check_history_trip(rep, a.full); check_dates(rep, files); check_git(rep)
    check_increment(rep, files, a.full); check_trips(rep, files, a.plan)
    return print_report(rep)

def cmd_snapshot(a):
    files = active_files(a.plan); SNAPSHOT_DIR.mkdir(exist_ok=True)
    changed = 0
    for f in files:
        sp = snap_path(f)
        if sp.exists() and filecmp.cmp(f, sp, shallow=False): continue
        changed += 1; print(f"  更新快照：{rel(f)}"); shutil.copyfile(f, sp)
    print(f"快照 {len(files)} 檔，更新 {changed}（{SNAPSHOT_DIR}）")
    return 0

def cmd_backup(a):
    BACKUP_DIR.mkdir(exist_ok=True); today = _dt.date.today().isoformat(); bad = 0
    for f in active_files(a.plan):
        if not f.is_relative_to(NOTES): continue
        dst = BACKUP_DIR / f"{f.name}.before-{a.round}-{today}.md"
        shutil.copyfile(f, dst)
        same = check_copy_fidelity(f, dst)                    # A17 主檢查
        print(f"  {'OK  ' if same else 'DIFF'} {rel(f)} → {dst.name}")
        bad += 0 if same else 1
    differ_detected = check_differ_probe(active_files(None)[0], BACKUP_DIR / "_differ_probe.tmp")   # A17 對照組
    print(f"  對照組（期望 differ）：{'OK 抓得到 1 byte 差異' if differ_detected else 'DEAD 比對通道死'}")
    return 2 if not differ_detected else (1 if bad else 0)

def cmd_moved(a):
    src, dst = Path(a.src), Path(a.dst)
    n, missing = check_lines_landed(src, dst)                 # A18 主檢查
    for i, l in missing: print(f"  未落地 {src.name}:{i} {clip(l, 90)}")
    ctrl = check_first_line_control(src, dst)                 # A18 對照組
    print(f"來源非空行 {n}，未落地 {len(missing)}；對照組（第一行在目的地）＝{ctrl}")
    return 2 if ctrl == 0 else (1 if missing else 0)


def cmd_align(a):
    """commit 收尾：plan 裡指向本 commit 改動檔案的 `檔:行`，該行要有帶本 commit hash 的對齊註記（filing §本專案細則）。"""
    h = subprocess.run(["git", "rev-parse", "--short=7", a.commit], cwd=PROJECT_ROOT,
                       capture_output=True, text=True).stdout.strip()
    names = subprocess.run(["git", "show", "--name-only", "--format=", a.commit], cwd=PROJECT_ROOT,
                           capture_output=True, text=True, encoding="utf-8").stdout.split()
    changed = {Path(n).name for n in names}
    if a.plan:                                                # 只掃指定的（filing：只對未結案的 plan）
        plans = sorted({plan_path(x) for x in a.plan})
        missing = [rel(p) for p in plans if not p.exists()]
        if missing:
            print(f"--plan 指的檔不存在：{missing}（路徑相對於 _notes/）"); return 2
        plans = [p for p in plans if p.name not in ALIGN_SKIP]
    else:
        plans = sorted(p for p in (NOTES / "plans").glob("*.md") if p.name not in ALIGN_SKIP)
    # 檔名中間可以有點（`foo.test.cjs`）：只認 `[\w\-]+` 會切成 `test.cjs`，對不上改動檔就漏掉
    ref_re = re.compile(r"([\w\-]+(?:\.[\w\-]+)*\.(?:js|cjs|json|mjs|ts|css|html))`?:(\d+)")
    bare_re = re.compile(r"`:\d+(?:-\d+)?`")
    total_refs, todo, human = 0, [], []
    for p in plans:
        for i, l in enumerate(lines_of(p), 1):
            refs = ref_re.findall(l)
            total_refs += len(refs)
            hit = sorted({f for f, _ in refs if f in changed})
            named = sorted({f for f in changed if f in l})
            if not hit and bare_re.search(l) and named:
                if len(named) == 1: hit = named
                else: human.append(f"{rel(p)}:{i} 省略檔名的行號，同行提到多個改動檔 {named}")
            if hit and not (ALIGN_TAG in l and h in l):
                todo.append(f"{rel(p)}:{i} {hit}：{clip(l, 80)}")
    print(f"commit {h}：改動 {len(changed)} 檔；plans 裡帶檔名的行號共 {total_refs} 處")
    for x in todo: print("  未對齊 " + x)
    for x in human: print("  人判   " + x)
    print(f"未對齊 {len(todo)} 行，人判 {len(human)} 行（逐行判斷：一行有多個行號時，有註記＝整行算已對齊）")
    if not changed or total_refs == 0:
        print("對照組 DEAD：commit 沒有改動檔，或 plans 裡找不到任何帶檔名的行號 ⇒ 結果不可信"); return 2
    return 1 if todo else 0


def main():
    if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="_notes 文件體檢機（收尾跑一次）")
    sp = ap.add_subparsers(dest="cmd", required=True)
    c = sp.add_parser("check"); c.add_argument("--full", action="store_true"); c.add_argument("--plan", action="append")
    s = sp.add_parser("snapshot"); s.add_argument("--plan", action="append")
    b = sp.add_parser("backup"); b.add_argument("round"); b.add_argument("--plan", action="append")
    m = sp.add_parser("moved"); m.add_argument("src"); m.add_argument("dst")
    al = sp.add_parser("align"); al.add_argument("commit"); al.add_argument("--plan", action="append")
    a = ap.parse_args()
    return {"check": cmd_check, "snapshot": cmd_snapshot, "backup": cmd_backup, "moved": cmd_moved,
            "align": cmd_align}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
