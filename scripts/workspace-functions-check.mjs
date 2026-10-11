import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const cli = require(join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
const account = cli.getProjectDefaultAccount(process.cwd()) || cli.getGlobalDefaultAccount();
const token = await cli.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' };
const workspaceEmail=process.argv.find(arg=>arg.startsWith('--workspace-email='))?.slice('--workspace-email='.length);
if (workspaceEmail) {
  const lookup=await fetch('https://identitytoolkit.googleapis.com/v1/projects/build-a-booking-ai/accounts:lookup',{method:'POST',headers,body:JSON.stringify({email:[workspaceEmail]})});
  const accountResult=await lookup.json();
  const uid=accountResult.users?.[0]?.localId;
  if(!uid) throw new Error('Account not found');
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/build-a-booking-ai/databases/(default)/documents/artifacts/book-and-buy-v1/users/${uid}/config/settings`,{headers});
  const result=await response.json();
  const fields=result.fields||{};
  console.log(JSON.stringify({workspaceStatus:response.status,exists:response.ok,brandName:fields.brandName?.stringValue,slug:fields.slug?.stringValue,onboardingComplete:fields.onboardingComplete?.booleanValue,isDemo:fields.isDemo?.booleanValue,counts:Object.fromEntries(['products','services','staff','clients','orders','bookings','threads'].map(key=>[key,fields[key]?.arrayValue?.values?.length||0]))}));
}
if (process.argv.includes('--warm-read-function') || process.argv.includes('--restore-scale-to-zero')) {
  const minInstanceCount=process.argv.includes('--warm-read-function')?1:0;
  const name='projects/build-a-booking-ai/locations/us-central1/functions/getOwnerWorkspace';
  const response=await fetch(`https://cloudfunctions.googleapis.com/v2/${name}?updateMask=serviceConfig.minInstanceCount`,{method:'PATCH',headers,body:JSON.stringify({name,serviceConfig:{minInstanceCount}})});
  const result=await response.json();
  console.log(JSON.stringify({warmupStatus:response.status,minInstanceCount,operation:result.name,error:result.error?.message}));
}
if (process.argv.includes('--quota-usage')) {
  const query = new URLSearchParams({filter:'metric.type="serviceruntime.googleapis.com/quota/allocation/usage" AND resource.type="consumer_quota" AND resource.labels.service="run.googleapis.com"', 'interval.endTime':new Date().toISOString(),'interval.startTime':new Date(Date.now()-900000).toISOString(),pageSize:'100'});
  const response=await fetch(`https://monitoring.googleapis.com/v3/projects/build-a-booking-ai/timeSeries?${query}`,{headers});
  const result=await response.json();
  console.log(JSON.stringify({usageStatus:response.status,error:result.error?.message,usage:result.timeSeries?.map(row=>({metric:row.metric.labels,location:row.resource.labels.location,latest:row.points?.[0]}))}));
}
if (process.argv.includes('--enable-quota-api')) {
  const response = await fetch('https://serviceusage.googleapis.com/v1/projects/885347299053/services/cloudquotas.googleapis.com:enable', {method:'POST',headers,body:'{}'});
  const result = await response.json();
  console.log(JSON.stringify({quotaApiEnableStatus:response.status,operation:result.name,error:result.error?.message}));
}
if (process.argv.includes('--quotas')) {
  const infoResponse = await fetch('https://cloudquotas.googleapis.com/v1/projects/885347299053/locations/global/services/run.googleapis.com/quotaInfos?pageSize=200', {headers:{...headers,'x-goog-user-project':'build-a-booking-ai'}});
  const info = await infoResponse.json();
  console.log(JSON.stringify({quotaInfoStatus:infoResponse.status,error:info.error?.message,nextPageToken:info.nextPageToken,info:info.quotaInfos?.map(row=>({quotaId:row.quotaId,metric:row.metric,title:row.quotaDisplayName,dimensions:row.dimensionsInfos?.filter(d=>!d.dimensions?.region||d.dimensions.region==='us-central1').map(d=>({dimensions:d.dimensions,value:d.details?.value}))}))}));
  const response = await fetch('https://serviceusage.googleapis.com/v1beta1/projects/885347299053/services/run.googleapis.com/consumerQuotaMetrics?view=FULL&pageSize=200', {headers});
  const result = await response.json();
  console.log(JSON.stringify({status:response.status,error:result.error?.message,quotas:(result.metrics||[]).filter(row=>/cpu|memory|instance/i.test(row.metric)).map(row=>({metric:row.metric,name:row.name,limits:row.consumerQuotaLimits?.map(limit=>({name:limit.name,unit:limit.unit,buckets:limit.quotaBuckets?.filter(bucket=>!bucket.dimensions?.region||bucket.dimensions.region==='us-central1')}))}))}));
}
if (process.argv.includes('--recent-errors')) {
  const response = await fetch('https://logging.googleapis.com/v2/entries:list', { method: 'POST', headers, body: JSON.stringify({resourceNames:['projects/build-a-booking-ai'], filter:`resource.type="cloud_run_revision" AND resource.labels.service_name="getownerworkspace" AND timestamp>="${new Date(Date.now()-600000).toISOString()}"`, orderBy:'timestamp desc', pageSize:20}) });
  const result = await response.json();
  console.log(JSON.stringify({status:response.status, errors:(result.entries || []).map(row=>({at:row.timestamp,message:row.textPayload || row.jsonPayload?.message,status:row.httpRequest?.status}))}));
}
if (process.argv.includes('--project-errors')) {
  const response = await fetch('https://logging.googleapis.com/v2/entries:list', {method:'POST',headers,body:JSON.stringify({resourceNames:['projects/build-a-booking-ai'],filter:`timestamp>="${new Date(Date.now()-600000).toISOString()}" AND severity>=WARNING`,orderBy:'timestamp desc',pageSize:40})});
  const result=await response.json();
  console.log(JSON.stringify({status:response.status,errors:(result.entries||[]).map(row=>({at:row.timestamp,resource:row.resource?.type,message:row.textPayload||row.jsonPayload?.message||row.protoPayload?.status?.message,status:row.httpRequest?.status}))}));
}
for (const service of ['getownerworkspace', 'patchownerworkspace']) {
  const base = `https://run.googleapis.com/v2/projects/build-a-booking-ai/locations/us-central1/services/${service}`;
  if (process.argv.includes('--status')) {
    const response = await fetch(base, {headers});
    const status = await response.json();
    console.log(JSON.stringify({service,status:response.status,conditions:status.conditions,terminalCondition:status.terminalCondition,scaling:status.scaling,templateScaling:status.template?.scaling,traffic:status.trafficStatuses,reconciling:status.reconciling}));
  }
  const response = await fetch(`${base}:getIamPolicy`, { headers });
  const policy = await response.json();
  if (!response.ok) throw new Error(`Cannot read ${service} policy: ${response.status} ${policy.error?.message || ''}`);
  console.log(JSON.stringify({ service, bindings: policy.bindings || [] }));
  if (process.argv.includes('--repair-callable-invoker')) {
    const binding = policy.bindings?.find(row => row.role === 'roles/run.invoker' && !row.condition);
    if (binding?.members.includes('allUsers')) continue;
    policy.bindings ||= [];
    if (binding) binding.members.push('allUsers');
    else policy.bindings.push({ role: 'roles/run.invoker', members: ['allUsers'] });
    const update = await fetch(`${base}:setIamPolicy`, { method: 'POST', headers, body: JSON.stringify({ policy }) });
    const result = await update.json();
    if (!update.ok) throw new Error(`Cannot repair ${service} callable invocation: ${update.status} ${result.error?.message || ''}`);
    console.log(JSON.stringify({ service, callableInvokerRepaired: true }));
  }
}
