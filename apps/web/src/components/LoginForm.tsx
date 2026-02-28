'use client';
import { useState } from 'react';
interface Props{onLogin:(pw:string)=>Promise<void>;}
export function LoginForm({onLogin}:Props){
  const [pw,setPw]=useState(''); const [err,setErr]=useState(''); const [load,setLoad]=useState(false);
  const submit=async(e:any)=>{e.preventDefault(); setErr(''); setLoad(true); try{await onLogin(pw);}catch{setErr('Invalid password');}finally{setLoad(false);} };
  return (<div className="min-h-screen bg-muzzle-bg flex items-center justify-center p-4"><form onSubmit={submit} className="w-full max-w-sm space-y-4"><h1 className="text-2xl font-bold text-muzzle-text text-center">Muzzle</h1><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" className="w-full px-4 py-3 bg-muzzle-surface border border-muzzle-border rounded-lg text-muzzle-text focus:outline-none focus:border-muzzle-accent" disabled={load}/>{err && <p className="text-red-500 text-sm text-center">{err}</p>}<button type="submit" disabled={load||!pw} className="w-full py-3 bg-muzzle-accent text-white rounded-lg font-medium disabled:opacity-50">{load?'Connecting...':'Connect'}</button></form></div>); }