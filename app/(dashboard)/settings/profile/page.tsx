'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/Avatar';
import { Upload, Check, Github, Zap, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_THEMES = [
  { name: 'Default', accent: '#7c6af7', bg: '#0e0e10', css: '' },
  {
    name: 'Dracula',
    accent: '#ff79c6',
    bg: '#282a36',
    css: '.profile-root {\n  --accent: #ff79c6;\n  --bg-base: #282a36;\n  --bg-surface: #44475a;\n  --text-primary: #f8f8f2;\n}',
  },
  {
    name: 'Nord',
    accent: '#88c0d0',
    bg: '#2e3440',
    css: '.profile-root {\n  --accent: #88c0d0;\n  --bg-base: #2e3440;\n  --bg-surface: #3b4252;\n  --text-primary: #eceff4;\n}',
  },
  {
    name: 'Catppuccin Mocha',
    accent: '#cba6f7',
    bg: '#1e1e2e',
    css: '.profile-root {\n  --accent: #cba6f7;\n  --bg-base: #1e1e2e;\n  --bg-surface: #313244;\n  --text-primary: #cdd6f4;\n}',
  },
  {
    name: 'Solarised Dark',
    accent: '#268bd2',
    bg: '#002b36',
    css: '.profile-root {\n  --accent: #268bd2;\n  --bg-base: #002b36;\n  --bg-surface: #073642;\n  --text-primary: #839496;\n}',
  },
  {
    name: 'Gruvbox',
    accent: '#fabd2f',
    bg: '#282828',
    css: '.profile-root {\n  --accent: #fabd2f;\n  --bg-base: #282828;\n  --bg-surface: #3c3836;\n  --text-primary: #ebdbb2;\n}',
  },
];

export default function ProfileSettingsPage() {
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    data: profileData,
    isLoading,
    refetch,
  } = api.user.getProfile.useQuery(
    { username: clerkUser?.username || '' },
    { enabled: !!clerkUser?.username },
  );

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      refetch();
    },
  });

  const updateCustomCSS = api.user.updateCustomCSS.useMutation({
    onSuccess: () => {
      setSuccessMsg('Appearance updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      refetch();
    },
  });

  const updateAvatar = api.user.updateAvatar.useMutation({
    onSuccess: () => {
      setSuccessMsg('Avatar updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      refetch();
    },
  });

  const getPresignedUrl = api.upload.getPresignedUrl.useMutation();

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    twitterUrl: '',
    githubUrl: '',
    headline: '',
  });

  const [cssCode, setCssCode] = useState('');

  useEffect(() => {
    if (profileData) {
      setFormData({
        displayName: profileData.displayName || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        website: profileData.website || '',
        twitterUrl: profileData.twitterUrl || '',
        githubUrl: profileData.githubUrl || '',
        headline: profileData.profile?.headline || '',
      });
      setCssCode(profileData.customCSS || '');
    }
  }, [profileData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="text-accent h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const handleCssSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomCSS.mutate({ customCSS: cssCode });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');

    try {
      // Get presigned URL
      const { presignedUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        target: 'avatar',
      });

      // Upload to R2
      const res = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!res.ok) throw new Error('Upload failed');

      // Update user avatar in DB
      await updateAvatar.mutateAsync({ avatar: publicUrl });
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Button variant="outline" size="sm" onClick={() => router.push(`/@${clerkUser?.username}`)}>
          View Public Profile
        </Button>
      </div>

      {(successMsg || errorMsg) && (
        <div
          className={cn(
            'animate-in fade-in slide-in-from-top-2 mb-6 rounded-lg border p-4 font-medium',
            successMsg
              ? 'border-green-500/50 bg-green-500/10 text-green-600'
              : 'border-red-500/50 bg-red-500/10 text-red-600',
          )}
        >
          {successMsg || errorMsg}
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="bg-background h-12 w-full justify-start gap-8 rounded-none border-b p-0 px-2">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:border-accent hover:text-accent h-11 rounded-none bg-transparent px-0 font-semibold transition-all data-[state=active]:border-b-2"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="data-[state=active]:border-accent hover:text-accent h-11 rounded-none bg-transparent px-0 font-semibold transition-all data-[state=active]:border-b-2"
          >
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="data-[state=active]:border-accent hover:text-accent h-11 rounded-none bg-transparent px-0 font-semibold transition-all data-[state=active]:border-b-2"
          >
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-8">
          <section className="bg-card rounded-xl border p-8 shadow-sm">
            <div className="border-bottom mb-10 flex flex-col items-start gap-8 pb-10 md:flex-row">
              <div className="group relative mx-auto md:mx-0">
                <Avatar className="border-background ring-border h-32 w-32 border-4 shadow-lg ring-1 transition-opacity group-hover:opacity-80">
                  <AvatarImage src={profileData?.avatar || undefined} />
                  <AvatarFallback className="bg-accent-dim text-accent text-4xl">
                    {profileData?.displayName?.[0] || profileData?.username[0]}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="border-background absolute right-0 bottom-0 rounded-full border-2 shadow-lg"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex-1 space-y-1 text-center md:text-left">
                <h2 className="text-2xl font-bold">Public Profile</h2>
                <p className="text-muted-foreground">Manage how you appear to others on Script.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    placeholder="Full Name"
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={formData.headline}
                    placeholder="e.g. Senior Software Engineer"
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    placeholder="City, Country"
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    placeholder="https://yoursite.com"
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="githubUrl">GitHub Username</Label>
                  <Input
                    id="githubUrl"
                    value={formData.githubUrl}
                    placeholder="username"
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterUrl">Twitter Username</Label>
                  <Input
                    id="twitterUrl"
                    value={formData.twitterUrl}
                    placeholder="@username"
                    onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  className="min-h-[120px]"
                  placeholder="Tell us about yourself..."
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="flex justify-end border-t pt-4">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  size="lg"
                  className="px-10"
                >
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </section>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-8">
          <section className="bg-card rounded-xl border p-8 shadow-sm">
            <h2 className="mb-2 text-2xl font-bold">Profile Themes</h2>
            <p className="text-muted-foreground mb-8">
              Choose a preset theme or write your own custom CSS.
            </p>

            <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3">
              {PRESET_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all hover:scale-[1.02]',
                    cssCode === theme.css
                      ? 'border-accent bg-accent-dim/20 shadow-lg'
                      : 'border-border bg-background hover:border-accent/40',
                  )}
                  onClick={() => setCssCode(theme.css)}
                >
                  <div className="flex h-12 w-full overflow-hidden rounded-md border">
                    <div className="flex-1" style={{ backgroundColor: theme.bg }} />
                    <div className="h-full w-6" style={{ backgroundColor: theme.accent }} />
                  </div>
                  <span className="text-sm font-bold">{theme.name}</span>
                  {cssCode === theme.css && <Check className="text-accent h-4 w-4" />}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="customCss" className="text-lg font-bold">
                  Custom CSS Editor
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCssCode('')}
                  className="text-muted-foreground text-xs"
                >
                  Reset to Default
                </Button>
              </div>
              <p className="text-muted-foreground bg-accent-dim/10 border-accent/10 rounded-md border p-3 text-sm">
                <strong>Pro Tip:</strong> All styles are scoped to your public profile under the{' '}
                <code>.profile-root</code> selector. You can use CSS variables like{' '}
                <code>--accent</code> to override colours.
              </p>
              <Textarea
                id="customCss"
                className="bg-background border-border-strong focus:ring-accent min-h-[300px] font-mono text-sm leading-relaxed whitespace-pre focus:ring-1 focus:outline-none"
                value={cssCode}
                placeholder=".profile-root { --accent: #ff00ea; }"
                onChange={(e) => setCssCode(e.target.value)}
              />
              <div className="flex justify-end border-t pt-4">
                <Button
                  onClick={handleCssSubmit}
                  disabled={updateCustomCSS.isPending}
                  size="lg"
                  className="px-10"
                >
                  {updateCustomCSS.isPending ? 'Applying...' : 'Apply Appearance'}
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-8">
          <section className="bg-card rounded-xl border p-8 shadow-sm">
            <h2 className="mb-2 text-2xl font-bold">Connected Accounts</h2>
            <p className="text-muted-foreground mb-8">
              Synchronize your activity from external platforms to your Script profile.
            </p>

            <div className="grid gap-6">
              <div className="bg-background/40 hover:bg-background/60 flex flex-col items-center justify-between gap-6 rounded-2xl border p-6 transition-colors sm:flex-row">
                <div className="flex items-center gap-5 text-center sm:text-left">
                  <div className="bg-accent-dim text-accent flex h-12 w-12 items-center justify-center rounded-xl">
                    <Github className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">GitHub Integration</p>
                    <p className="text-secondary text-sm">
                      Display your contributions and pinned repositories.
                    </p>
                  </div>
                </div>
                {profileData?.githubConnection ? (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-bold tracking-wider text-green-500 uppercase">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-500/5 hover:text-red-600"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => router.push('/api/auth/github')}
                    className="w-full px-8 font-bold shadow-md sm:w-auto"
                  >
                    Connect GitHub
                  </Button>
                )}
              </div>

              <div className="bg-background/40 hover:bg-background/60 flex flex-col items-center justify-between gap-6 rounded-2xl border p-6 transition-colors sm:flex-row">
                <div className="flex items-center gap-5 text-center sm:text-left">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">WakaTime Sync</p>
                    <p className="text-secondary text-sm">
                      Showcase your daily coding hours and language stats.
                    </p>
                  </div>
                </div>
                {/* WakaTime check logic here */}
                <Button
                  onClick={() => router.push('/api/auth/wakatime')}
                  variant="outline"
                  className="w-full px-8 font-bold sm:w-auto"
                >
                  Connect WakaTime
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
