const R    = '\x1b[0m';
const DIM  = '\x1b[2m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const YEL  = '\x1b[33m';
const GRN  = '\x1b[32m';
const RED  = '\x1b[31m';

function ts(): string {
  const d  = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${DIM}[${hh}:${mm}:${ss}]${R}`;
}

const ARROW = `${CYAN}→${R}`;
const USER  = `${YEL}muzzle${R}`;

export const log = {
  startup(port: number | string, workdir: string): void {
    console.log('');
    console.log(`${BOLD}${CYAN}⚡ muzzle${R}  ${DIM}›${R}  port ${BOLD}${port}${R}  ${DIM}›${R}  ${workdir}`);
    console.log('');
  },

  login(ip: string, success: boolean): void {
    const result = success ? `${GRN}✓${R}` : `${RED}✗ failed${R}`;
    console.log(`${ts()} ${ARROW}  ${BOLD}login${R}    ${USER}  ${ip.slice(0, 15).padEnd(15)}  ${result}`);
  },

  sessionCreated(name: string): void {
    console.log(`${ts()} ${ARROW}  ${BOLD}session${R}  ${USER}  "${name}"  ${GRN}+ created${R}`);
  },

  sessionDeleted(name: string): void {
    console.log(`${ts()} ${ARROW}  ${BOLD}session${R}  ${USER}  "${name}"  ${RED}- deleted${R}`);
  },

  command(sessionName: string, cmd: string): void {
    console.log(`${ts()} ${ARROW}  ${BOLD}cmd${R}      ${USER}  "${sessionName}"  ${DIM}$${R} ${cmd}`);
  },
};
