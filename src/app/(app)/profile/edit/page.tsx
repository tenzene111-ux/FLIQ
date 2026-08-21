"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check, X, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useAuthStore } from "@/store/auth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { toast } from "@/store/toast";
import { isValidUsername } from "@/lib/utils";

export default function EditProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [genderVisible, setGenderVisible] = useState(false);
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  const debouncedUsername = useDebouncedValue(username, 400);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setUsername(user.username);
    setBio(user.bio);
    setWebsite(user.website || "");
    setLocation(user.location || "");
    setGenderVisible(user.genderVisible);
    setGender(user.gender || "");
    setAvatarUrl(user.avatarUrl);
  }, [user]);

  useEffect(() => {
    if (!debouncedUsername || debouncedUsername === user?.username) {
      setUsernameStatus("idle");
      return;
    }
    if (!isValidUsername(debouncedUsername)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    fetch(`/api/auth/check-username?username=${encodeURIComponent(debouncedUsername)}`)
      .then((r) => r.json())
      .then((d) => setUsernameStatus(d.available ? "available" : "taken"))
      .catch(() => setUsernameStatus("idle"));
  }, [debouncedUsername, user?.username]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAvatarUrl(data.url);
      patchUser({ avatarUrl: data.url });
      toast("success", "Profile photo updated");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      toast("error", "Please choose a valid, available username");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, username, bio, website, location, genderVisible, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      patchUser(data.user);
      toast("success", "Profile updated");
      router.push(`/profile/${data.user.username}`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <PageContainer className="max-w-lg mx-auto w-full safe-top">
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <button onClick={() => router.back()} className="text-white" aria-label="Cancel">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold">Edit Profile</h1>
        <Button size="sm" onClick={handleSave} loading={saving}>
          Save
        </Button>
      </div>

      <div className="flex flex-col items-center px-4 pb-6">
        <button onClick={() => fileInputRef.current?.click()} className="relative" aria-label="Change profile photo">
          <Avatar src={avatarUrl} alt={user.displayName} size="2xl" ring />
          <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-brand-horizontal flex items-center justify-center border-2 border-background">
            {uploadingAvatar ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      <div className="px-4 flex flex-col gap-4">
        <div>
          <Label htmlFor="displayName">Name</Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              maxLength={30}
              className="pr-9"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === "checking" && <Loader2 size={16} className="animate-spin text-muted-2" />}
              {usernameStatus === "available" && <Check size={16} className="text-success" />}
              {(usernameStatus === "taken" || usernameStatus === "invalid") && <X size={16} className="text-danger" />}
            </span>
          </div>
          {usernameStatus === "taken" && <p className="text-danger text-xs mt-1">This username is taken</p>}
          {usernameStatus === "invalid" && <p className="text-danger text-xs mt-1">3-30 characters, letters/numbers/underscore only</p>}
          {usernameStatus === "available" && <p className="text-success text-xs mt-1">Username is available</p>}
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} />
          <p className="text-right text-xs text-muted-2 mt-1">{bio.length}/160</p>
        </div>
        <div>
          <Label htmlFor="website">Website / Links</Label>
          <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none"
          >
            <option value="">Prefer not to say</option>
            <option value="woman">Woman</option>
            <option value="man">Man</option>
            <option value="nonbinary">Non-binary</option>
            <option value="custom">Custom</option>
          </select>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-xs text-muted">Show gender on profile</span>
            <Switch checked={genderVisible} onChange={setGenderVisible} label="Show gender on profile" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
