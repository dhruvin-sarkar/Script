"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/app/providers";
import { MapPin, Link as LinkIcon, Github, Twitter, Award } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileHeaderProps {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    twitterUrl: string | null;
    githubUrl: string | null;
    reputation: number;
    _count: {
      followers: number;
      following: number;
    };
  };
  isFollowing: boolean;
  isOwner: boolean;
}

export function ProfileHeader({ user, isFollowing: initialIsFollowing, isOwner }: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(user._count.followers);

  const followMutation = api.user.follow.useMutation({
    onMutate: () => {
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    },
    onError: () => {
      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
    },
  });

  const unfollowMutation = api.user.unfollow.useMutation({
    onMutate: () => {
      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
    },
    onError: () => {
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    },
  });

  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollowMutation.mutate({ userId: user.id });
    } else {
      followMutation.mutate({ userId: user.id });
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-8 shadow-sm mb-12 relative overflow-hidden">
      {/* Decorative background accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
        <div className="relative group">
          <Avatar className="w-32 h-32 border-4 border-background shadow-xl ring-1 ring-border">
            <AvatarImage src={user.avatar || undefined} alt={user.username} />
            <AvatarFallback className="text-4xl font-bold bg-accent-dim text-accent">
              {user.displayName?.[0] || user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOwner && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-white text-xs font-semibold">Change</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                {user.displayName || user.username}
                {user.reputation > 500 && <Award className="w-6 h-6 text-warning fill-warning/10" />}
              </h1>
              <p className="text-muted-foreground text-lg">@{user.username}</p>
            </div>
            
            {!isOwner && (
              <Button 
                onClick={handleFollowToggle}
                variant={isFollowing ? "outline" : "default"}
                size="lg"
                className={cn(
                  "w-full md:w-auto font-semibold px-8 transition-all active:scale-95",
                  !isFollowing && "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20"
                )}
                disabled={followMutation.isPending || unfollowMutation.isPending}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
            {isOwner && (
              <a 
                href="/settings/profile" 
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full md:w-auto font-semibold")}
              >
                Edit Profile
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-secondary">
            {user.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {user.location}
              </span>
            )}
            {user.website && (
              <a 
                href={user.website.startsWith('http') ? user.website : `https://${user.website}`} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-1.5 hover:text-accent transition-colors"
              >
                <LinkIcon className="w-4 h-4" /> Website
              </a>
            )}
            {user.githubUrl && (
              <a 
                href={user.githubUrl.startsWith('http') ? user.githubUrl : `https://github.com/${user.githubUrl.replace(/^@/, '')}`} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-1.5 hover:text-accent transition-colors"
              >
                <Github className="w-4 h-4" /> GitHub
              </a>
            )}
            {user.twitterUrl && (
              <a 
                href={user.twitterUrl.startsWith('http') ? user.twitterUrl : `https://twitter.com/${user.twitterUrl.replace(/^@/, '')}`} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-1.5 hover:text-accent transition-colors"
              >
                <Twitter className="w-4 h-4" /> Twitter
              </a>
            )}
          </div>

          {user.bio && (
            <p className="text-primary/90 max-w-2xl leading-relaxed text-base italic border-l-2 border-accent/20 pl-4 py-1">
              {user.bio}
            </p>
          )}

          <div className="flex items-center gap-8 pt-2">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-primary">{user.reputation}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Reputation</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-primary">{followersCount}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Followers</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-primary">{user._count.following}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Following</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
