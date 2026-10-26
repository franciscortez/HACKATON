import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { brandSchema } from "./brand.schema";
import { researchSourceSchema, ResearchError } from "./types";
const usageSchema=z.object({costUsd:z.number().nonnegative().nullable(),reservedUsd:z.number().nonnegative(),maxUsd:z.number().nonnegative(),runIds:z.array(z.string().max(100)).max(10),budgetPolicy:z.enum(["cap","target"]).optional()});
const snapshotSchema=z.object({companyUrl:z.url().max(2048),collectedAt:z.iso.datetime(),sources:z.array(researchSourceSchema.extend({text:z.string().max(12000),title:z.string().max(1000)})).max(6),brand:brandSchema,gaps:z.array(z.string().max(500)).max(30),usage:usageSchema}).refine(s=>s.sources.reduce((n,p)=>n+p.text.length,0)<=40000);
export type ResearchSnapshot=z.infer<typeof snapshotSchema>;
const signature=(payload:string,secret:string)=>createHmac("sha256",secret).update("research-recovery-v1\0"+payload).digest();
export function sealResearch(snapshot:ResearchSnapshot,secret:string,now=Date.now()) {
 const payload=Buffer.from(JSON.stringify({version:1,expires:now+86400000,snapshot:snapshotSchema.parse(snapshot)})).toString("base64url");
 return `${payload}.${signature(payload,secret).toString("base64url")}`;
}
export function openResearch(token:string,secret:string,companyUrl:string,now=Date.now()):ResearchSnapshot {
 try {
  if(!secret||token.length>240000)throw Error();
  const [payload,mac,...extra]=token.split("."); if(extra.length||!payload||!mac)throw Error();
  const given=Buffer.from(mac,"base64url"),expected=signature(payload,secret);
  if(given.length!==expected.length||!timingSafeEqual(given,expected))throw Error();
  const value=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
  if(value.version!==1||typeof value.expires!=="number"||value.expires<=now)throw Error();
  const snapshot=snapshotSchema.parse(value.snapshot);
  if(new URL(snapshot.companyUrl).href!==new URL(companyUrl).href)throw Error();
  return snapshot;
 }catch{throw new ResearchError("recovery_expired","Saved research is invalid or expired. Start a new research run explicitly.",undefined,400);}
}
