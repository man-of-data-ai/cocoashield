"use client";

import { Pencil, Plus, Settings2, ToggleLeft, ToggleRight } from "lucide-react";
import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import Alert from "@/components/ui/Alert";
import Dialog from "@/components/ui/Dialog";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { setRuntimeSeverityThresholds } from "@/lib/severity";
import { configurationService } from "@/services/configuration-service";
import { userService } from "@/services/user-service";
import type { CurrentUserProfile } from "@/types/user-profile";
import type { DroneProfile, DroneProfileInput, PlatformSettings } from "@/types/configuration";

const EMPTY_PROFILE: DroneProfileInput = {
  profileId: "",
  manufacturer: "",
  model: "",
  vectorType: "drone_aile_tournante",
  supportsRtk: true,
  rtkPrecisionCm: 1,
  rtkFloatPrecisionCm: 20,
  noCorrectionPrecisionM: 0.5,
  metadataFormat: "exif_xmp_dji",
  latitudeField: "XMP-drone-dji:GpsLatitude",
  longitudeField: "XMP-drone-dji:GpsLongitude",
  absoluteAltitudeField: "XMP-drone-dji:AbsoluteAltitude",
  relativeAltitudeField: "XMP-drone-dji:RelativeAltitude",
  orientationFields: "GimbalYawDegree,GimbalPitchDegree,GimbalRollDegree",
  timestampField: "EXIF:DateTimeOriginal",
  rtkStatusField: "XMP-drone-dji:RtkFlag",
  rtkStatusMapping: "0=gnss_seul;16=gnss_seul;34=rtk_float;50=rtk_fix",
  nativeMissionExport: "DJI Terra / FlightHub 2",
  active: true,
};

export default function ConfigurationPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [currentProfile, setCurrentProfile] = useState<CurrentUserProfile | null>(null);
  const [profiles, setProfiles] = useState<DroneProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DroneProfile | null>(null);
  const [profileForm, setProfileForm] = useState<DroneProfileInput>(EMPTY_PROFILE);
  const [profileSaving, setProfileSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextSettings, nextProfiles, me] = await Promise.all([
        configurationService.getSettings(),
        configurationService.listDroneProfiles(),
        userService.me(),
      ]);
      setSettings(nextSettings);
      setProfiles(nextProfiles);
      setCurrentProfile(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger la configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function updateSetting<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await configurationService.updateSettings({
        severityLow: settings.severityLow,
        severityModerate: settings.severityModerate,
        severityHigh: settings.severityHigh,
        severityCritical: settings.severityCritical,
        clusteringRadiusM: settings.clusteringRadiusM,
        minImagesPerZone: settings.minImagesPerZone,
        minimumConfidence: settings.minimumConfidence,
        dedupDistanceM: settings.dedupDistanceM,
        dedupWindowS: settings.dedupWindowS,
        refreshIntervalConnectedS: settings.refreshIntervalConnectedS,
        batchRecalcMaxDelayMin: settings.batchRecalcMaxDelayMin,
        syncRetryIntervalMin: settings.syncRetryIntervalMin,
        offlineTileCacheSizeMb: settings.offlineTileCacheSizeMb,
        historyRetentionMonths: settings.historyRetentionMonths,
        sessionDurationMinutes: settings.sessionDurationMinutes,
      });
      setSettings(saved);
      setRuntimeSeverityThresholds({
        modere: saved.severityModerate,
        eleve: saved.severityHigh,
        critique: saved.severityCritical,
      });
      setSuccess("Configuration enregistrée. Elle sera utilisée dès le prochain calcul cartographique.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer la configuration.");
    } finally {
      setSaving(false);
    }
  }

  function openCreateProfile() {
    setEditingProfile(null);
    setProfileForm(EMPTY_PROFILE);
    setProfileDialogOpen(true);
  }

  function openEditProfile(profile: DroneProfile) {
    setEditingProfile(profile);
    setProfileForm({
      profileId: profile.profileId,
      manufacturer: profile.manufacturer,
      model: profile.model,
      vectorType: profile.vectorType,
      supportsRtk: profile.supportsRtk,
      rtkPrecisionCm: profile.rtkPrecisionCm,
      rtkFloatPrecisionCm: profile.rtkFloatPrecisionCm,
      noCorrectionPrecisionM: profile.noCorrectionPrecisionM,
      metadataFormat: profile.metadataFormat,
      latitudeField: profile.latitudeField,
      longitudeField: profile.longitudeField,
      absoluteAltitudeField: profile.absoluteAltitudeField,
      relativeAltitudeField: profile.relativeAltitudeField,
      orientationFields: profile.orientationFields,
      timestampField: profile.timestampField,
      rtkStatusField: profile.rtkStatusField,
      rtkStatusMapping: profile.rtkStatusMapping,
      nativeMissionExport: profile.nativeMissionExport,
      active: profile.active,
    });
    setProfileDialogOpen(true);
  }

  async function saveProfile() {
    if (!profileForm.profileId.trim() || !profileForm.manufacturer.trim() || !profileForm.model.trim() || !profileForm.metadataFormat.trim()) {
      setError("Renseignez l’identifiant, le constructeur, le modèle et le format des métadonnées.");
      return;
    }
    setProfileSaving(true);
    setError(null);
    try {
      const saved = editingProfile
        ? await configurationService.updateDroneProfile(editingProfile.id, profileForm)
        : await configurationService.createDroneProfile(profileForm);
      setProfiles((current) => editingProfile
        ? current.map((profile) => profile.id === saved.id ? saved : profile)
        : [...current, saved].sort((a, b) => `${a.manufacturer}${a.model}`.localeCompare(`${b.manufacturer}${b.model}`)));
      setProfileDialogOpen(false);
      setSuccess(`Profil ${saved.profileId} enregistré et ${saved.active ? "disponible" : "désactivé"} pour les analyses.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer le profil de vecteur.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function toggleProfile(profile: DroneProfile) {
    setError(null);
    try {
      const saved = await configurationService.updateDroneProfile(profile.id, { active: !profile.active });
      setProfiles((current) => current.map((item) => item.id === saved.id ? saved : item));
      setSuccess(`${saved.profileId} est maintenant ${saved.active ? "actif" : "désactivé"}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de modifier ce profil.");
    }
  }

  return (
    <AppShell title="Configuration" description={currentProfile?.isPlatformAdmin ? "Paramètres partagés de la plateforme CocoaShield." : "Paramètres locaux de votre instance On-Premise."}>
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}
      {currentProfile && !currentProfile.isPlatformAdmin && <div className="mb-4 rounded-2xl border border-[#DCE8D7] bg-[#F3F8EF] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#628847]">Instance On-Premise</p><p className="mt-1 text-sm font-semibold text-[#203B2A]">Configuration locale · {currentProfile.cooperative || "Organisation cliente"}</p><p className="mt-1 text-xs leading-5 text-slate-500">Ces seuils, profils drones et règles de rétention sont propres à cette installation et ne modifient pas les autres organisations CocoaShield.</p></div>}

      {loading || !settings ? (
        <div className="flex justify-center py-16"><Spinner label="Chargement de la configuration..." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(520px,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-[#244B32]" />
              <h2 className="text-lg font-semibold text-slate-900">Seuils de sévérité et clustering</h2>
            </div>

            <div className="space-y-6">
              {([
                ["Seuil critique", "severityCritical"],
                ["Seuil élevé", "severityHigh"],
                ["Seuil modéré", "severityModerate"],
              ] as const).map(([label, key]) => (
                <label key={key} className="block">
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>{label}</span><span>{Math.round(settings[key] * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={Math.round(settings[key] * 100)} onChange={(e) => updateSetting(key, Number(e.target.value) / 100)} className="w-full accent-[#244B32]" />
                </label>
              ))}

              <label className="block">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Rayon de clustering</span><span>{settings.clusteringRadiusM} m</span>
                </div>
                <input type="range" min="1" max="200" step="1" value={settings.clusteringRadiusM} onChange={(e) => updateSetting("clusteringRadiusM", Number(e.target.value))} className="w-full accent-[#244B32]" />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Minimum d'images par zone
                <input type="number" min="1" value={settings.minImagesPerZone} onChange={(e) => updateSetting("minImagesPerZone", Math.max(1, Number(e.target.value)))} className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#6E8B3D]" />
              </label>

              <label className="block text-sm font-medium text-slate-700">Confiance minimale avant vérification terrain
                <div className="mt-2 flex items-center gap-3"><input type="range" min="0" max="100" value={Math.round(settings.minimumConfidence*100)} onChange={(e)=>updateSetting("minimumConfidence",Number(e.target.value)/100)} className="w-full accent-[#244B32]"/><span className="w-12 text-right text-xs font-bold">{Math.round(settings.minimumConfidence*100)}%</span></div>
              </label>

              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
                {[
                  ["Déduplication (m)","dedupDistanceM"],["Fenêtre dédup. (s)","dedupWindowS"],["Rafraîchissement (s)","refreshIntervalConnectedS"],["Recalcul max (min)","batchRecalcMaxDelayMin"],["Retry synchro (min)","syncRetryIntervalMin"],["Cache tuiles (Mo)","offlineTileCacheSizeMb"],["Rétention historique (mois)","historyRetentionMonths"],["Durée session (min)","sessionDurationMinutes"],
                ].map(([label,key])=><label key={key} className="text-xs font-semibold text-slate-600">{label}<input type="number" min="1" value={settings[key as keyof PlatformSettings] as number} onChange={(e)=>updateSetting(key as keyof PlatformSettings, Number(e.target.value) as never)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal"/></label>)}
              </div>

              <button type="button" onClick={saveSettings} disabled={saving} className="rounded-xl bg-[#244B32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#356A46] disabled:opacity-50">
                {saving ? "Enregistrement..." : "Sauvegarder les paramètres"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Profils de vecteurs</h2>
                <p className="mt-1 text-xs text-slate-500">Les profils actifs sont proposés lors du lancement d’une analyse.</p>
              </div>
              <button type="button" onClick={openCreateProfile} className="inline-flex items-center gap-2 rounded-xl bg-[#244B32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#356A46]"><Plus className="h-4 w-4" /> Ajouter</button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Identifiant</th><th className="px-4 py-3">Constructeur / modèle</th><th className="px-4 py-3">Vecteur</th><th className="px-4 py-3">Précision</th><th className="px-4 py-3">Métadonnées</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Aucun profil configuré.</td></tr>
                  ) : profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{profile.profileId}</td>
                      <td className="px-4 py-3"><div className="font-medium text-slate-900">{profile.manufacturer}</div><div className="text-xs text-slate-500">{profile.model}</div></td>
                      <td className="px-4 py-3 text-slate-700">{profile.vectorType.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 text-slate-700"><div>{profile.supportsRtk && profile.rtkPrecisionCm !== null ? `RTK Fix ${profile.rtkPrecisionCm} cm` : "Sans RTK"}</div><div className="text-xs text-slate-400">GNSS : {profile.noCorrectionPrecisionM} m</div></td>
                      <td className="px-4 py-3 text-slate-700"><div>{profile.metadataFormat}</div><div className="max-w-[180px] truncate text-xs text-slate-400">{profile.latitudeField}</div></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${profile.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{profile.active ? "Actif" : "Inactif"}</span></td>
                      <td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => openEditProfile(profile)} title="Modifier" className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void toggleProfile(profile)} title={profile.active ? "Désactiver" : "Activer"} className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200">{profile.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} title={editingProfile ? "Modifier le profil de vecteur" : "Ajouter un profil de vecteur"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Identifiant<input value={profileForm.profileId} onChange={(e) => setProfileForm((v) => ({ ...v, profileId: e.target.value }))} placeholder="dji_matrice4e" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Constructeur<input value={profileForm.manufacturer} onChange={(e) => setProfileForm((v) => ({ ...v, manufacturer: e.target.value }))} placeholder="DJI" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Modèle<input value={profileForm.model} onChange={(e) => setProfileForm((v) => ({ ...v, model: e.target.value }))} placeholder="Matrice 4E" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Type de vecteur<select value={profileForm.vectorType} onChange={(e) => setProfileForm((v) => ({ ...v, vectorType: e.target.value as DroneProfileInput["vectorType"] }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="drone_aile_tournante">Drone à aile tournante</option><option value="drone_aile_fixe">Drone à aile fixe</option><option value="robot_sol">Robot au sol</option><option value="mobile">Application mobile</option></select></label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2"><input type="checkbox" checked={profileForm.supportsRtk} onChange={(e) => setProfileForm((v) => ({ ...v, supportsRtk: e.target.checked }))} className="accent-[#244B32]"/> Support RTK</label>
          <label className="text-sm font-medium text-slate-700">Précision RTK Fix (cm)<input type="number" min="0" step="0.01" value={profileForm.rtkPrecisionCm ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, rtkPrecisionCm: e.target.value === "" ? null : Number(e.target.value) }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Précision RTK Float (cm)<input type="number" min="0" step="0.1" value={profileForm.rtkFloatPrecisionCm ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, rtkFloatPrecisionCm: e.target.value === "" ? null : Number(e.target.value) }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Précision sans correction (m)<input type="number" min="0" step="0.1" value={profileForm.noCorrectionPrecisionM} onChange={(e) => setProfileForm((v) => ({ ...v, noCorrectionPrecisionM: Number(e.target.value) }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Format métadonnées<input value={profileForm.metadataFormat} onChange={(e) => setProfileForm((v) => ({ ...v, metadataFormat: e.target.value }))} placeholder="exif_xmp_dji" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Champ latitude<input value={profileForm.latitudeField} onChange={(e) => setProfileForm((v) => ({ ...v, latitudeField: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Champ longitude<input value={profileForm.longitudeField} onChange={(e) => setProfileForm((v) => ({ ...v, longitudeField: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Altitude absolue<input value={profileForm.absoluteAltitudeField ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, absoluteAltitudeField: e.target.value || null }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Altitude relative<input value={profileForm.relativeAltitudeField ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, relativeAltitudeField: e.target.value || null }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Champs orientation (yaw,pitch,roll)<input value={profileForm.orientationFields} onChange={(e) => setProfileForm((v) => ({ ...v, orientationFields: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Champ horodatage<input value={profileForm.timestampField} onChange={(e) => setProfileForm((v) => ({ ...v, timestampField: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700">Champ statut RTK<input value={profileForm.rtkStatusField ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, rtkStatusField: e.target.value || null }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Mapping statut RTK<input value={profileForm.rtkStatusMapping ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, rtkStatusMapping: e.target.value || null }))} placeholder="34=rtk_float;50=rtk_fix" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Export mission natif<input value={profileForm.nativeMissionExport ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, nativeMissionExport: e.target.value || null }))} placeholder="DJI Terra / FlightHub 2" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={profileForm.active ?? true} onChange={(e) => setProfileForm((v) => ({ ...v, active: e.target.checked }))} className="accent-[#244B32]" /> Profil actif</label>
          <button type="button" onClick={() => void saveProfile()} disabled={profileSaving} className="rounded-xl bg-[#244B32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#356A46] disabled:opacity-50">{profileSaving ? "Enregistrement..." : "Enregistrer"}</button>
        </div>
      </Dialog>
    </AppShell>
  );
}
