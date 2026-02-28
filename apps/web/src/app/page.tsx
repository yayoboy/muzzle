'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
export default function Home(){
  const {isAuthenticated,isLoading,login,logout}=useAuth();
  const [sessionId,setSessionId]=useState<string|null>(null); const [ttydUrl,setTtydUrl]=useState<string|null>(null);
  if(isLoading) return <div className="min-h-screen bg-muzzle-bg flex items-center justify-center">Loading...</div>;
  if(!isAuthenticated) return <LoginForm onLogin={async pw=>{const {token,expiresAt}=await api.login(pw); setToken(token,expiresAt); }}/>;
  const selectSession=async(id:string)=>{setSessionId(id); const {url}=await api.getSessionAttachUrl(id); setTtydUrl(url); };
  const newSession=async()=>{const s=await api.createSession(); setSessionId(s.id); const {url}=await api.getSessionAttachUrl(s.id); setTtydUrl(url); };
  return (<div className="h-screen flex flex-col bg-muzzle-bg"><div className="flex-1 bg-muzzle-bg">Terminal placeholder</div></div>);
}