// অভিযোগ অ্যাডমিন — শাখা / ধরন / দপ্তর-অফিস ব্যবস্থাপনা (যোগ · এডিট · ডিলিট)
// ইউজারের নির্দেশ: অ্যাডমিন প্যানেল থেকে এগুলো যোগ, এডিট, ডিলিট ও সম্পাদনা করা যাবে।
// পরিবর্তন Realtime Database-এ সঙ্গে সঙ্গে প্রকাশ হয় — সাইটের ফর্ম/ফিল্টার রিয়েলটাইম হালনাগাদ।

"use client";

import { useState } from "react";
import {
  Building2,
  Check,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Chip, inputCls } from "@/components/ui/kit";
import { useStore } from "@/lib/store";
import {
  deleteTaxoItem,
  saveTaxoItem,
  taxoPathLabel,
  type TaxoItemData,
  type TaxoPath,
} from "@/lib/taxonomy";
import { bn } from "@/lib/bn";

type PathTab = TaxoPath;

const TAB_META: { key: PathTab; label: string; icon: React.ReactNode }[] = [
  { key: "branches", label: "শাখা", icon: <FolderTree className="size-4" aria-hidden /> },
  { key: "types", label: "ধরন", icon: <Tags className="size-4" aria-hidden /> },
  { key: "departments", label: "দপ্তর / অফিস", icon: <Building2 className="size-4" aria-hidden /> },
];

export function TaxonomiesPanel() {
  const [tab, setTab] = useState<PathTab>("branches");
  const d = useStore();
  const t = d?.taxonomies ?? null;

  // তালিকা: RTDB খালি হলে বিল্ট-ইন ডিফল্ট (সেগুলোই প্রাথমিক অবস্থা)
  const branchNames = t && t.branches.length > 0 ? t.branches.map((b) => b.name) : [];
  const items: { id: string; name: string; branch?: string; officeKind?: string; rtdb: boolean }[] =
    tab === "branches"
      ? t && t.branches.length > 0
        ? t.branches.map((b) => ({ id: b.id, name: b.name, rtdb: true }))
        : []
      : tab === "types"
        ? t && t.types.length > 0
          ? t.types.map((x) => ({ id: x.id, name: x.name, branch: x.branch, rtdb: true }))
          : []
        : t && t.departments.length > 0
          ? t.departments.map((x) => ({ id: x.id, name: x.name, branch: x.branch, officeKind: x.officeKind, rtdb: true }))
          : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-bold">শাখা · ধরন · দপ্তর — যোগ, এডিট, ডিলিট</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          এখানে যোগ/সম্পাদনা করা তালিকা Realtime Database-এ সংরক্ষিত হয় এবং সাইটের
          অভিযোগ-ফর্ম ও ফিল্টারে সঙ্গে সঙ্গে দেখা যায়। নিজের তালিকা যোগ না করা পর্যন্ত
          সাইটে বিল্ট-ইন ডিফল্ট (৮ শাখা × ৪৩ ধরন × দপ্তর) চলতে থাকে।
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-surface-secondary p-1">
          {TAB_META.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setTab(m.key)}
              aria-pressed={tab === m.key}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-bold transition-colors ${
                tab === m.key ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface"
              }`}
            >
              {m.icon}
              <span className="truncate">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Editor path={tab} items={items} branchNames={branchNames} />
    </div>
  );
}

function Editor({
  path,
  items,
  branchNames,
}: {
  path: PathTab;
  items: { id: string; name: string; branch?: string; officeKind?: string; rtdb: boolean }[];
  branchNames: string[];
}) {
  // যোগ-ফর্ম
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [newKind, setNewKind] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  // এডিট
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editKind, setEditKind] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [delId, setDelId] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const doAdd = async () => {
    if (addBusy) return;
    setAddBusy(true);
    const data: TaxoItemData = { name: newName, branch: newBranch, officeKind: newKind };
    const res = await saveTaxoItem(path, null, data);
    setAddBusy(false);
    if (res.ok) {
      toast.success(`${taxoPathLabel(path)} যোগ হয়েছে — সাইটে সঙ্গে সঙ্গে দেখা যাবে।`);
      setNewName(""); setNewBranch(""); setNewKind(""); setShowAdd(false);
    } else {
      toast.error(res.error ?? "যোগ করা যায়নি।");
    }
  };

  const startEdit = (it: { id: string; name: string; branch?: string; officeKind?: string }) => {
    setEditId(it.id);
    setEditName(it.name);
    setEditBranch(it.branch ?? "");
    setEditKind(it.officeKind ?? "");
  };

  const doEdit = async () => {
    if (!editId || editBusy) return;
    setEditBusy(true);
    const res = await saveTaxoItem(path, editId, { name: editName, branch: editBranch, officeKind: editKind });
    setEditBusy(false);
    if (res.ok) {
      toast.success("সম্পাদনা সংরক্ষিত।");
      setEditId(null);
    } else {
      toast.error(res.error ?? "সংরক্ষণ করা যায়নি।");
    }
  };

  const doDelete = async (id: string) => {
    if (delBusy) return;
    setDelBusy(true);
    const res = await deleteTaxoItem(path, id);
    setDelBusy(false);
    setDelId(null);
    if (res.ok) toast.success("মুছে ফেলা হয়েছে।");
    else toast.error(res.error ?? "মুছে ফেলা যায়নি।");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* যোগ কার্ড */}
      {showAdd ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-accent/30 bg-accent/[0.05] p-4">
          <p className="text-sm font-bold">নতুন {taxoPathLabel(path)} যোগ করুন</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="নাম — যেমন: জনস্বাস্থ্য প্রকৌশল অফিস"
            className={inputCls}
            aria-label="নাম"
          />
          {(path === "types" || path === "departments") && (
            <select
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              className={`${inputCls} h-11`}
              aria-label="শাখা"
            >
              <option value="">— শাখা নির্বাচন —</option>
              {branchNames.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
          {path === "departments" && (
            <input
              value={newKind}
              onChange={(e) => setNewKind(e.target.value)}
              placeholder="অফিসের ধরন (ঐচ্ছিক) — যেমন: জেলা অফিস"
              className={inputCls}
              aria-label="অফিসের ধরন"
            />
          )}
          <div className="flex gap-2">
            <Button isDisabled={addBusy} onPress={() => void doAdd()}>
              {addBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              সংরক্ষণ
            </Button>
            <Button variant="tertiary" onPress={() => { setShowAdd(false); setNewName(""); }}>
              বাতিল
            </Button>
          </div>
        </div>
      ) : (
        <Button className="self-start" onPress={() => setShowAdd(true)}>
          <Plus className="size-4" aria-hidden />
          নতুন {taxoPathLabel(path)} যোগ
        </Button>
      )}

      {/* তালিকা */}
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
          এখনো নিজের {taxoPathLabel(path)} যোগ করা হয়নি — সাইটে বিল্ট-ইন ডিফল্ট চলছে।
          নিজের তালিকা শুরু করলে সেটিই প্রযোজ্য হবে।
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((it, i) =>
            editId === it.id ? (
              <div key={it.id} className="flex flex-col gap-2.5 border-t border-border/70 bg-accent/[0.04] p-3.5 first:border-t-0">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputCls}
                  aria-label="সম্পাদনা — নাম"
                />
                {(path === "types" || path === "departments") && (
                  <select
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value)}
                    className={`${inputCls} h-11`}
                    aria-label="সম্পাদনা — শাখা"
                  >
                    <option value="">— শাখা নির্বাচন —</option>
                    {branchNames.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                )}
                {path === "departments" && (
                  <input
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value)}
                    placeholder="অফিসের ধরন (ঐচ্ছিক)"
                    className={inputCls}
                    aria-label="সম্পাদনা — অফিসের ধরন"
                  />
                )}
                <div className="flex gap-2">
                  <Button size="sm" isDisabled={editBusy} onPress={() => void doEdit()}>
                    {editBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
                    সংরক্ষণ
                  </Button>
                  <Button size="sm" variant="tertiary" onPress={() => setEditId(null)}>
                    <X className="size-3.5" aria-hidden />
                    বাতিল
                  </Button>
                </div>
              </div>
            ) : (
              <div key={it.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border/70" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{it.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                    {it.branch && <Chip variant="tertiary" size="sm">{it.branch}</Chip>}
                    {it.officeKind && <span>{it.officeKind}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" onPress={() => startEdit(it)} aria-label={`${it.name} সম্পাদনা`}>
                  <Pencil className="size-3.5" aria-hidden />
                </Button>
                {delId === it.id ? (
                  <span className="flex items-center gap-1.5">
                    <Button size="sm" variant="danger" isDisabled={delBusy} onPress={() => void doDelete(it.id)}>
                      {delBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
                      নিশ্চিত
                    </Button>
                    <Button size="sm" variant="tertiary" onPress={() => setDelId(null)}>না</Button>
                  </span>
                ) : (
                  <Button size="sm" variant="outline" className="text-danger" onPress={() => setDelId(it.id)} aria-label={`${it.name} মুছুন`}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                )}
              </div>
            )
          )}
          <p className="border-t border-border/70 px-4 py-2.5 text-[10px] text-muted">
            মোট {bn(items.length)} টি — রিয়েলটাইম ডাটাবেজ থেকে লোড হচ্ছে
          </p>
        </div>
      )}
    </div>
  );
}
