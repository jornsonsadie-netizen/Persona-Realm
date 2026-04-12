import { useState } from "react";
import {
  useGetAdminSettings, useUpdateAdminSettings,
  useListAdminModels, useCreateAdminModel, useUpdateAdminModel, useDeleteAdminModel,
  useGetAdminStats,
  getGetAdminSettingsQueryKey, getListAdminModelsQueryKey, getGetAdminStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminDashboard() {
  const qc = useQueryClient();
  const { data: settings } = useGetAdminSettings();
  const { data: models } = useListAdminModels();
  const { data: stats } = useGetAdminStats();
  const updateSettings = useUpdateAdminSettings();
  const createModel = useCreateAdminModel();
  const updateModel = useUpdateAdminModel();
  const deleteModel = useDeleteAdminModel();

  const [providerName, setProviderName] = useState("");
  const [providerEndpoint, setProviderEndpoint] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [maxContext, setMaxContext] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [editingModel, setEditingModel] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const handleSaveSettings = async () => {
    await updateSettings.mutateAsync({
      data: {
        aiProviderName: providerName || undefined,
        aiProviderEndpoint: providerEndpoint || undefined,
        aiProviderApiKey: providerApiKey || undefined,
        maxContextSize: maxContext ? Number(maxContext) : undefined,
      },
    });
    qc.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleAddModel = async () => {
    if (!newModelId || !newModelName) return;
    await createModel.mutateAsync({ data: { modelId: newModelId, displayName: newModelName } });
    qc.invalidateQueries({ queryKey: getListAdminModelsQueryKey() });
    setNewModelId("");
    setNewModelName("");
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    await updateModel.mutateAsync({ id, data: { enabled } });
    qc.invalidateQueries({ queryKey: getListAdminModelsQueryKey() });
  };

  const handleSetDefault = async (id: number) => {
    await updateModel.mutateAsync({ id, data: { isDefault: true } });
    qc.invalidateQueries({ queryKey: getListAdminModelsQueryKey() });
  };

  const handleRename = async (id: number) => {
    await updateModel.mutateAsync({ id, data: { displayName: editName } });
    qc.invalidateQueries({ queryKey: getListAdminModelsQueryKey() });
    setEditingModel(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this model?")) return;
    await deleteModel.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListAdminModelsQueryKey() });
  };

  const StatCard = ({ label, value }: { label: string; value: any }) => (
    <div className="p-5 rounded-2xl text-center" style={{ background: "rgba(255,0,170,0.06)", border: "1px solid rgba(255,0,170,0.2)" }}>
      <div className="text-3xl font-bold text-primary mb-1" style={{ fontFamily: "Rajdhani, serif" }}>{value ?? "—"}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: "Rajdhani, serif" }}>Admin Dashboard</h1>
        <p className="text-muted-foreground">Configure AI providers, models, and platform settings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Characters" value={stats?.totalCharacters} />
        <StatCard label="Chats" value={stats?.totalChats} />
        <StatCard label="Messages" value={stats?.totalMessages} />
        <StatCard label="Active Models" value={stats?.activeModels} />
        <StatCard label="Users" value={stats?.totalUsers} />
      </div>

      {/* Provider Settings */}
      <div className="p-6 rounded-2xl space-y-4" style={{ background: "rgba(15,0,35,0.6)", border: "1px solid rgba(255,0,170,0.2)", backdropFilter: "blur(12px)" }}>
        <h2 className="text-xl font-bold" style={{ fontFamily: "Rajdhani, serif" }}>AI Provider Configuration</h2>
        {settings && (
          <div className="text-sm text-muted-foreground mb-3 p-3 rounded-lg" style={{ background: "rgba(255,0,170,0.04)", border: "1px solid rgba(255,0,170,0.1)" }}>
            <strong>Current:</strong> {settings.aiProviderName} — {settings.aiProviderEndpoint}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Provider Name</label>
            <input value={providerName} onChange={e => setProviderName(e.target.value)} placeholder={settings?.aiProviderName || "e.g. NVIDIA"} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">API Endpoint</label>
            <input value={providerEndpoint} onChange={e => setProviderEndpoint(e.target.value)} placeholder={settings?.aiProviderEndpoint || "https://..."} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">API Key</label>
            <input type="password" value={providerApiKey} onChange={e => setProviderApiKey(e.target.value)} placeholder="Enter new API key (leave blank to keep)" className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Max Context Size (tokens)</label>
            <input type="number" value={maxContext} onChange={e => setMaxContext(e.target.value)} placeholder={String(settings?.maxContextSize || 20000)} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
          </div>
        </div>
        <button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="px-6 py-2.5 rounded-full font-bold text-sm transition-all" style={{ background: "linear-gradient(135deg, #ff00aa, #9b59ff)", color: "white" }}>
          {settingsSaved ? "Saved!" : updateSettings.isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Models */}
      <div className="p-6 rounded-2xl space-y-4" style={{ background: "rgba(15,0,35,0.6)", border: "1px solid rgba(255,0,170,0.2)", backdropFilter: "blur(12px)" }}>
        <h2 className="text-xl font-bold" style={{ fontFamily: "Rajdhani, serif" }}>AI Models</h2>

        {/* Add model */}
        <div className="flex flex-wrap gap-3 p-4 rounded-xl" style={{ background: "rgba(255,0,170,0.04)", border: "1px solid rgba(255,0,170,0.1)" }}>
          <input value={newModelId} onChange={e => setNewModelId(e.target.value)} placeholder="Model ID (e.g. gpt-4o)" className="flex-1 min-w-40 px-3 py-2 rounded-lg text-sm border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
          <input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="Display Name" className="flex-1 min-w-40 px-3 py-2 rounded-lg text-sm border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
          <button onClick={handleAddModel} disabled={!newModelId || !newModelName} className="px-5 py-2 rounded-lg text-sm font-bold" style={{ background: "linear-gradient(135deg, #ff00aa, #9b59ff)", color: "white" }}>
            Add Model
          </button>
        </div>

        {/* Model list */}
        <div className="space-y-2">
          {models?.map(model => (
            <div key={model.id} className="flex items-center gap-3 p-4 rounded-xl transition-all" style={{
              background: model.enabled ? "rgba(255,0,170,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${model.enabled ? "rgba(255,0,170,0.2)" : "rgba(255,255,255,0.08)"}`,
              opacity: model.enabled ? 1 : 0.5,
            }}>
              <div className="flex-1 min-w-0">
                {editingModel === model.id ? (
                  <div className="flex gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="px-3 py-1 rounded-lg text-sm border border-primary/30 bg-primary/5 focus:outline-none flex-1" />
                    <button onClick={() => handleRename(model.id)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "rgba(255,0,170,0.2)", color: "#ff00aa" }}>Save</button>
                    <button onClick={() => setEditingModel(null)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>Cancel</button>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {model.displayName}
                      {model.isDefault && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,0,170,0.2)", color: "#ff00aa" }}>DEFAULT</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{model.modelId}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleToggle(model.id, !model.enabled)} className="text-xs px-3 py-1 rounded-lg transition-all" style={{
                  background: model.enabled ? "rgba(0,255,100,0.1)" : "rgba(255,0,0,0.1)",
                  border: model.enabled ? "1px solid rgba(0,255,100,0.3)" : "1px solid rgba(255,0,0,0.3)",
                  color: model.enabled ? "#00ff64" : "#ff6666",
                }}>
                  {model.enabled ? "Enabled" : "Disabled"}
                </button>
                {!model.isDefault && (
                  <button onClick={() => handleSetDefault(model.id)} className="text-xs px-2 py-1 rounded-lg transition-all" style={{ background: "rgba(255,0,170,0.08)", border: "1px solid rgba(255,0,170,0.2)", color: "#ff00aa" }}>
                    Set Default
                  </button>
                )}
                <button onClick={() => { setEditingModel(model.id); setEditName(model.displayName); }} className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
                  Rename
                </button>
                <button onClick={() => handleDelete(model.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(255,0,0,0.06)", color: "#ff6666" }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {(!models || models.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No models configured. Add one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
