import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useCreateCharacter, useUpdateCharacter, useGetCharacter,
  useListTags, useCreateTag, useUploadImage,
  getListCharactersQueryKey, getGetCharacterQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function estimateTokens(text: string) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

const EMPTY_FORM = {
  name: "", age: "", personality: "", description: "",
  backgroundStory: "", lore: "", introMessage: "", profilePicture: "",
};

export default function CreateCharacter({ editMode = false, characterId }: { editMode?: boolean; characterId?: number }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createCharacter = useCreateCharacter();
  const updateCharacter = useUpdateCharacter();
  const uploadImage = useUploadImage();
  const { data: tags } = useListTags();
  const createTag = useCreateTag();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: existing, isLoading: loadingExisting } = useGetCharacter(
    characterId ?? 0,
    { query: { enabled: editMode && !!characterId, queryKey: getGetCharacterQueryKey(characterId ?? 0) } }
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [populated, setPopulated] = useState(false);

  useEffect(() => {
    if (editMode && existing && !populated) {
      setForm({
        name: existing.name ?? "",
        age: String(existing.age ?? ""),
        personality: existing.personality ?? "",
        description: existing.description ?? "",
        backgroundStory: existing.backgroundStory ?? "",
        lore: existing.lore ?? "",
        introMessage: existing.introMessage ?? "",
        profilePicture: existing.profilePicture ?? "",
      });
      setSelectedTags(existing.tags ?? []);
      setPopulated(true);
    }
  }, [editMode, existing, populated]);

  const introTokens = estimateTokens(form.introMessage);
  const isPending = createCharacter.isPending || updateCharacter.isPending;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleTagKey = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const name = tagInput.trim().toLowerCase();
      if (!selectedTags.includes(name)) {
        await createTag.mutateAsync({ data: { name } });
        setSelectedTags(prev => [...prev, name]);
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
    setForm(f => ({ ...f, profilePicture: result.url }));
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const age = Number(form.age);
    if (age < 18) {
      setError("Character must be above 18");
      return;
    }
    if (introTokens > 1000) {
      setError("Intro message is too long (max ~1000 tokens)");
      return;
    }
    try {
      const payload = { ...form, age, tags: selectedTags, profilePicture: form.profilePicture || null };
      if (editMode && characterId) {
        await updateCharacter.mutateAsync({ id: characterId, data: payload });
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey(characterId) });
        queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
        setLocation(`/characters/${characterId}`);
      } else {
        await createCharacter.mutateAsync({ data: payload });
        queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
        setLocation("/discover");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Something went wrong");
    }
  };

  if (editMode && loadingExisting) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(255,0,170,0.06)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Rajdhani, serif" }}>
          {editMode ? "Edit Character" : "Create Character"}
        </h1>
        <p className="text-muted-foreground">{editMode ? "Update your character's details" : "Bring your character to life"}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile Picture */}
        <div className="flex items-center gap-5">
          <div
            className="w-24 h-24 rounded-xl overflow-hidden cursor-pointer ring-2 ring-primary/30 hover:ring-primary/70 transition-all"
            style={{ background: "rgba(255,0,170,0.08)" }}
            onClick={() => fileRef.current?.click()}
          >
            {form.profilePicture ? (
              <img src={form.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">
                {uploading ? "Uploading..." : "Upload Photo"}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{ background: "rgba(255,0,170,0.1)", border: "1px solid rgba(255,0,170,0.3)", color: "#ff00aa" }}
            >
              {form.profilePicture ? "Change Image" : "Choose Image"}
            </button>
            <p className="text-xs text-muted-foreground mt-1">Upload from gallery</p>
          </div>
        </div>

        <Field label="Name" required>
          <input value={form.name} onChange={set("name")} required placeholder="Character name" />
        </Field>

        <Field label="Age (must be 18+)" required>
          <input type="number" value={form.age} onChange={set("age")} required min={18} placeholder="18" />
          {form.age && Number(form.age) < 18 && (
            <p className="text-xs mt-1" style={{ color: "#ff4444" }}>Character must be above 18</p>
          )}
        </Field>

        <Field label="Personality" required>
          <textarea value={form.personality} onChange={set("personality")} required rows={3} placeholder="Describe the character's personality..." />
        </Field>

        <Field label="Description" required>
          <textarea value={form.description} onChange={set("description")} required rows={3} placeholder="Brief description..." />
        </Field>

        <Field label="Background Story" required>
          <textarea value={form.backgroundStory} onChange={set("backgroundStory")} required rows={4} placeholder="The character's backstory..." />
        </Field>

        <Field label="Lore" required>
          <textarea value={form.lore} onChange={set("lore")} required rows={4} placeholder="World lore and additional context..." />
        </Field>

        <Field label={`Intro Message (${introTokens}/1000 tokens)`} required>
          <textarea value={form.introMessage} onChange={set("introMessage")} required rows={3} placeholder="The first message the character says..." />
          {introTokens > 900 && (
            <p className="text-xs mt-1" style={{ color: introTokens > 1000 ? "#ff4444" : "#ff9900" }}>
              {introTokens > 1000 ? "Over limit!" : "Approaching limit"}
            </p>
          )}
        </Field>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider text-xs">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs flex items-center gap-1" style={{ background: "rgba(255,0,170,0.15)", border: "1px solid rgba(255,0,170,0.4)", color: "#ff00aa" }}>
                {tag}
                <button type="button" onClick={() => setSelectedTags(p => p.filter(t => t !== tag))} className="ml-1 opacity-70 hover:opacity-100">×</button>
              </span>
            ))}
            {tags?.filter(t => !selectedTags.includes(t.name)).map(tag => (
              <button key={tag.id} type="button" onClick={() => setSelectedTags(p => [...p, tag.name])} className="px-3 py-1 rounded-full text-xs transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>
                + {tag.name}
              </button>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            placeholder="Type a tag and press Enter..."
            className="w-full px-4 py-2 rounded-lg text-sm border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50"
          />
        </div>

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.3)", color: "#ff6666" }}>{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-3 rounded-full font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
              boxShadow: "0 0 20px rgba(255,0,170,0.3)",
              color: "white",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (editMode ? "Saving..." : "Creating...") : (editMode ? "Save Changes" : "Create Character")}
          </button>
          <button
            type="button"
            onClick={() => setLocation(editMode && characterId ? `/characters/${characterId}` : "/discover")}
            className="px-6 py-3 rounded-full transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-muted-foreground">
        {label}{required && " *"}
      </label>
      <div className="[&_input]:w-full [&_input]:px-4 [&_input]:py-2.5 [&_input]:rounded-xl [&_input]:border [&_input]:border-primary/20 [&_input]:bg-primary/5 [&_input]:focus:outline-none [&_input]:focus:border-primary/60 [&_input]:transition-all [&_textarea]:w-full [&_textarea]:px-4 [&_textarea]:py-2.5 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-primary/20 [&_textarea]:bg-primary/5 [&_textarea]:focus:outline-none [&_textarea]:focus:border-primary/60 [&_textarea]:transition-all [&_textarea]:resize-none">
        {children}
      </div>
    </div>
  );
}
