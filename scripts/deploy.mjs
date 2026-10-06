import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const env={...process.env,WRANGLER_SEND_METRICS:'false'};
// Preserve project-local OAuth state when a restricted environment cannot update
// the user's global Wrangler configuration. No credentials enter the build.
if(existsSync('.wrangler-local/.wrangler/config/default.toml')){
 env.XDG_CONFIG_HOME=path.resolve('.wrangler-local');
 env.WRANGLER_LOG_PATH=path.resolve('.wrangler-local/deploy.log');
}
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy'],{env,stdio:'inherit'});
process.exit(result.status??1);
