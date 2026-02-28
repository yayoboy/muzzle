const TK='muzzle_token'; const TE='muzzle_token_expires';
export function getStoredToken(){if(typeof window==='undefined')return null; const t=localStorage.getItem(TK); const e=localStorage.getItem(TE); if(!t||!e) return null; if(new Date(e)<new Date()){clearToken();return null;} return t;}
export function setToken(t:string,e:string){localStorage.setItem(TK,t); localStorage.setItem(TE,e); api.setToken(t);}
export function clearToken(){localStorage.removeItem(TK); localStorage.removeItem(TE); api.clearToken();}
export function initAuth(){const t=getStoredToken(); if(t){api.setToken(t);return true;}return false;}