import { useState, useRef, useEffect } from "react";
import {
  useListPersonas, useDeletePersona, useSetMainPersona,
  useCreatePersona, useUpdatePersona, useGetPersona,
  useCreateTag, useListTags, useUploadImage,
  getListPersonasQueryKey, getGetPersonaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function estimateTokens(text: string) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

export default function Personas() {
  const queryClient = useQueryClient();
  const { data: personas, isLoading } = useListPersonas();
  const deletePersona = useDeletePersona();
  const setMain = useSetMainPersona();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this persona?")) return;
    await deletePersona.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListPersonasQueryKey() });
  };

  const handleSetMain = async (id: number) => {
    await setMain.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListPersonasQueryKey() });
  };

  const handleDoneEdit = () => {
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: getListPersonasQueryKey() });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: "Rajdhani, serif" }}>My Personas</h1>
          <p className="text-muted-foreground">Your identities in the world of LoreWeave</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditingId(null); }}
          className="px-5 py-2.5 rounded-full font-semibold text-sm transition-all"
          style={{
            background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
            color: "white",
            boxShadow: "0 0 15px rgba(255,0,170,0.3)",
          }}
        >
          + Create Persona
        </button>
      </div>

      {showCreate && (
        <PersonaForm
          mode="create"
          onDone={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: getListPersonasQueryKey() }); }}
        />
      )}

      {editingId !== null && (
        <PersonaForm mode="edit" personaId={editingId} onDone={handleDoneEdit} />
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "rgba(255,0,170,0.06)" }} />)}
        </div>
      ) : !personas || personas.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">No personas yet. Create one to start chatting!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {personas.map(persona => (
            <div
              key={persona.id}
              className="p-5 rounded-2xl relative transition-all"
              style={{
                background: persona.isMain ? "rgba(255,0,170,0.08)" : "rgba(15,0,35,0.6)",
                border: persona.isMain ? "1px solid rgba(255,0,170,0.5)" : "1px solid rgba(255,0,170,0.15)",
                backdropFilter: "blur(12px)",
                boxShadow: persona.isMain ? "0 0 20px rgba(255,0,170,0.1)" : "none",
                opacity: editingId === persona.id ? 0.5 : 1,
              }}
            >
              {persona.isMain && (
                <div className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,0,170,0.2)", color: "#ff00aa", border: "1px solid rgba(255,0,170,0.5)" }}>
                  MAIN
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                {persona.avatarUrl ? (
                  <img src={persona.avatarUrl} alt={persona.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-primary/40" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-primary/50" style={{ background: "rgba(255,0,170,0.08)", fontFamily: "Rajdhani, serif", fontSize: "1.5rem" }}>
                    {persona.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-bold" style={{ fontFamily: "Rajdhani, serif" }}>{persona.name}</div>
                  <div className="text-sm text-muted-foreground">Age {persona.age}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{persona.description}</p>
              {persona.tags && persona.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {persona.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,0,170,0.08)", color: "rgba(255,0,170,0.7)" }}>{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                {!persona.isMain && (
                  <button onClick={() => handleSetMain(persona.id)} className="text-xs px-3 py-1.5 rounded-lg transition-all" style={{ background: "rgba(255,0,170,0.1)", border: "1px solid rgba(255,0,170,0.3)", color: "#ff00aa" }}>
                    Set as Main
                  </button>
                )}
                <button
                  onClick={() => { setShowCreate(false); setEditingId(editingId === persona.id ? null : persona.id); }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: editingId === persona.id ? "rgba(255,0,170,0.15)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {editingId === persona.id ? "Cancel Edit" : "Edit"}
                </button>
                <button onClick={() => handleDelete(persona.id)} className="text-xs px-3 py-1.5 rounded-lg transition-all" style={{ background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.2)", color: "#ff6666" }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type PersonaFormProps =
  | { mode: "create"; onDone: () => void }
  | { mode: "edit"; personaId: number; onDone: () => void };

function PersonaForm(props: PersonaFormProps) {
  const { mode, onDone } = props;
  const personaId = mode === "edit" ? (props as any).personaId as number : undefined;

  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();
  const { data: existing, isLoading: loadingExisting } = useGetPersona(
    personaId ?? 0,
    { query: { enabled: mode === "edit" && !!personaId, queryKey: getGetPersonaQueryKey(personaId ?? 0) } }
  );
  const { data: tags } = useListTags();
  const createTag = useCreateTag();
  const uploadImage = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ name: "", age: "", personality: "", description: "", lore: "", avatarUrl: "" });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [populated, setPopulated] = useState(false);

  useEffect(() => {
    if (mode === "edit" && existing && !populated) {
      setForm({
        name: existing.name ?? "",
        age: String(existing.age ?? ""),
        personality: existing.personality ?? "",
        description: existing.description ?? "",
        lore: existing.lore ?? "",
        avatarUrl: existing.avatarUrl ?? "",
      });
      setSelectedTags(existing.tags ?? []);
      setPopulated(true);
    }
  }, [mode, existing, populated]);

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleTagKey = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const name = tagInput.trim().toLowerCase();
      if (!selectedTags.includes(name)) {
        await createTag.mutateAsync({ data: { name } });
        setSelectedTags(p => [...p, name]);
      }
      setTagInput("");
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadImage.mutateAsync({ data: fd as any });
    setForm(f => ({ ...f, avatarUrl: result.url }));
    setUploading(false);
  };

  const isPending = createPersona.isPending || updatePersona.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...form, age: Number(form.age), tags: selectedTags, avatarUrl: form.avatarUrl || null };
      if (mode === "edit" && personaId) {
        await updatePersona.mutateAsync({ id: personaId, data: payload });
        queryClient.invalidateQueries({ queryKey: getGetPersonaQueryKey(personaId) });
      } else {
        await createPersona.mutateAsync({ data: payload });
      }
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong");
    }
  };

  if (mode === "edit" && loadingExisting) {
    return (
      <div className="mb-8 p-6 rounded-2xl space-y-3" style={{ background: "rgba(15,0,35,0.6)", border: "1px solid rgba(255,0,170,0.2)", backdropFilter: "blur(12px)" }}>
        {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(255,0,170,0.06)" }} />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-6 rounded-2xl space-y-4" style={{ background: "rgba(15,0,35,0.6)", border: "1px solid rgba(255,0,170,0.2)", backdropFilter: "blur(12px)" }}>
      <h2 className="text-xl font-bold" style={{ fontFamily: "Rajdhani, serif" }}>
        {mode === "edit" ? "Edit Persona" : "New Persona"}
      </h2>

      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer ring-1 ring-primary/30"
          style={{ background: "rgba(255,0,170,0.08)" }}
          onClick={() => fileRef.current?.click()}
        >
          {form.avatarUrl ? (
            <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center p-1">
              {uploading ? "..." : "Photo"}
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,0,170,0.1)", border: "1px solid rgba(255,0,170,0.3)", color: "#ff00aa" }}
        >
          {form.avatarUrl ? "Change Avatar" : "Upload Avatar"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input value={form.name} onChange={set("name")} required placeholder="Name" className="px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
        <input type="number" value={form.age} onChange={set("age")} required min={1} placeholder="Age" className="px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
      </div>
      <textarea value={form.personality} onChange={set("personality")} required rows={2} placeholder="Personality..." className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50 resize-none" />
      <textarea value={form.description} onChange={set("description")} required rows={2} placeholder="Description..." className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50 resize-none" />
      <textarea value={form.lore} onChange={set("lore")} required rows={2} placeholder="Lore / background..." className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50 resize-none" />

      <div>
        <div className="flex flex-wrap gap-1 mb-1">
          {selectedTags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(255,0,170,0.1)", color: "#ff00aa" }}>
              {tag}
              <button type="button" onClick={() => setSelectedTags(p => p.filter(t => t !== tag))}>×</button>
            </span>
          ))}
          {tags?.filter(t => !selectedTags.includes(t.name)).map(tag => (
            <button key={tag.id} type="button" onClick={() => setSelectedTags(p => [...p, tag.name])} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}>
              + {tag.name}
            </button>
          ))}
        </div>
        <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey} placeholder="Add tags (Enter)..." className="w-full px-3 py-2 rounded-lg text-sm border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="px-6 py-2 rounded-full font-bold text-sm" style={{ background: "linear-gradient(135deg, #ff00aa, #9b59ff)", color: "white", opacity: isPending ? 0.7 : 1 }}>
          {isPending ? (mode === "edit" ? "Saving..." : "Creating...") : (mode === "edit" ? "Save Changes" : "Create")}
        </button>
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-full text-sm" style={{ background: "rgba(255,255,255,0.06)" }}>Cancel</button>
      </div>
    </form>
  );
}
