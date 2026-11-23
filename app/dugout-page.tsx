"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FanAuth, fanRequest } from "./fan-activity";

type Comment = { id: number; body: string; display_name: string; created_at: string };
type DugoutPost = { id: number; body: string; display_name: string; created_at: string; likes_count: number; comments_count: number; liked_by_me: boolean; comments: Comment[] };
const basePath = () => window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
const stamp = (value: string) => new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function DugoutPage() {
  const [posts, setPosts] = useState<DugoutPost[]>([]);
  const [profile, setProfile] = useState<{ id: string; display_name: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [body, setBody] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const sharedPostId = new URLSearchParams(window.location.search).get("post");

  const load = useCallback(async () => {
    const query = sharedPostId ? `?post=${encodeURIComponent(sharedPostId)}` : "";
    const result = await fanRequest(`/api/dugout/posts${query}`);
    setPosts(result.posts as DugoutPost[]);
  }, [sharedPostId]);

  useEffect(() => {
    let active = true;
    fanRequest("/api/fan/me").then((result) => { if (active) setProfile(result.fan); }).catch(() => {}).finally(() => {
      if (active) load().catch((reason: Error) => setError(reason.message));
    });
    return () => { active = false; };
  }, [load]);

  async function publish(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await fanRequest("/api/dugout/posts", { method: "POST", body: JSON.stringify({ body }) });
      setBody(""); setMessage("Your post is in The Dugout."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not publish your post."); }
    finally { setBusy(false); }
  }

  async function toggleLike(post: DugoutPost) {
    if (!profile) { setAuthOpen(true); return; }
    try {
      const result = await fanRequest(`/api/dugout/posts/${post.id}/likes`, { method: "POST", body: "{}" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked_by_me: result.liked, likes_count: result.likes_count } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update your like."); }
  }

  async function comment(event: FormEvent, post: DugoutPost) {
    event.preventDefault();
    if (!profile) { setAuthOpen(true); return; }
    const text = commentDrafts[post.id]?.trim(); if (!text) return;
    try {
      await fanRequest(`/api/dugout/posts/${post.id}/comments`, { method: "POST", body: JSON.stringify({ body: text }) });
      setCommentDrafts((current) => ({ ...current, [post.id]: "" })); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add your comment."); }
  }

  async function share(post: DugoutPost) {
    const url = new URL(`${basePath()}dugout.html?post=${post.id}`, window.location.origin).toString();
    if (navigator.share) { try { await navigator.share({ title: "The Dugout · PHF Premier League", text: post.body, url }); return; } catch (reason) { if (reason instanceof Error && reason.name === "AbortError") return; } }
    await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2200);
  }

  return <main className="dugout-page">
    <header className="dugout-hero"><div className="dugout-hero-inner"><span>PHF Premier League · Season 5</span><h1>The<br/><em>Dugout.</em></h1><p>Player shoutouts, matchday moments, and the things that make this tournament yours.</p><a href="#dugout-feed">Join the conversation ↓</a></div></header>
    <div className="dugout-layout">
      <section className="dugout-compose" aria-labelledby="dugout-compose-title"><div className="dugout-compose-heading"><div className="dugout-overline">A note from the boundary</div><h2 id="dugout-compose-title">Share a moment</h2><p>Write about a player, a match, your team, or anything else from the tournament.</p></div>
        {profile ? <form onSubmit={publish}><label className="dugout-writing-label" htmlFor="dugout-body">Your post</label><textarea id="dugout-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} minLength={3} required placeholder="What would you like everyone to know?"/><div className="dugout-compose-bottom"><span>Posting as <b>{profile.display_name}</b></span><span className="dugout-character-count">{body.length}<i>/500</i></span></div><button className="dugout-publish" type="submit" disabled={busy || body.trim().length < 3}>{busy ? "Posting…" : "Post to The Dugout"}</button></form> : <div className="dugout-signin"><p>Sign in with your Fan Picks account to post, like, and comment.</p><button type="button" onClick={() => setAuthOpen((value) => !value)}>{authOpen ? "Close sign in" : "Sign in to join in"}</button>{authOpen && <FanAuth onAuth={(fan) => { setProfile(fan); setAuthOpen(false); setMessage(`Welcome to The Dugout, ${fan.display_name}.`); }}/>}</div>}
        {message && <p className="dugout-message" role="status">{message}</p>}{error && <p className="dugout-error" role="alert">{error}</p>}
      </section>
      <section className="dugout-feed" id="dugout-feed" aria-label="Dugout posts"><div className="dugout-feed-heading"><div><span>From the PHF community</span><h2>{sharedPostId ? "Shared post" : "The conversation"}</h2></div><b>{posts.length} {posts.length === 1 ? "post" : "posts"}</b></div>
        {!posts.length && !error && <div className="dugout-empty"><span>THE DUGOUT IS OPEN</span><p>Be the first to share a moment from the tournament.</p></div>}
        {posts.map((post) => <article className="dugout-post" key={post.id} id={`post-${post.id}`}><header><span className="dugout-avatar">{post.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{post.display_name}</strong><small>{stamp(post.created_at)}</small></div><button className="dugout-share" type="button" onClick={() => share(post)} aria-label="Share this post"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"/></svg></button></header><p className="dugout-post-body">{post.body}</p><div className="dugout-post-actions"><button className={post.liked_by_me ? "is-liked" : ""} type="button" onClick={() => toggleLike(post)} aria-pressed={post.liked_by_me}>♥ <span>{post.likes_count} {post.likes_count === 1 ? "like" : "likes"}</span></button><span>▱ {post.comments_count} {post.comments_count === 1 ? "comment" : "comments"}</span><button className="dugout-share-text" type="button" onClick={() => share(post)}>{copied ? "Link copied" : "Share post"}</button></div>
          <div className="dugout-comments">{post.comments.map((item) => <div className="dugout-comment" key={item.id}><strong>{item.display_name}</strong><p>{item.body}</p></div>)}<form onSubmit={(event) => comment(event, post)}><label className="dugout-sr-only" htmlFor={`comment-${post.id}`}>Write a comment</label><input id={`comment-${post.id}`} value={commentDrafts[post.id] || ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={280} placeholder={profile ? "Add a comment…" : "Sign in to comment…"}/><button type="submit">Reply</button></form></div>
        </article>)}
      </section>
    </div>
    <footer className="dugout-footer"><a href={basePath()}>PHF Premier League</a><span>Keep it kind. Keep it about the game.</span><a href={`${basePath()}fan.html`}>Fan Picks ↗</a></footer>
  </main>;
}
