import { test,expect,vi } from "vitest";
import { GET } from "@/app/api/research/preview/route";
import { readPreview } from "@/services/research/preview";
vi.mock("@/services/settings",()=>({getSettings:()=>({dataPolicy:"local-only"})}));
vi.mock("@/services/research/preview",()=>({readPreview:vi.fn().mockResolvedValue(new Uint8Array([255,216,255]))}));
test("local-only preview never fetches previously saved cloud images",async()=>{const response=await GET(new Request("http://localhost/api/research/preview?token=saved"));expect(response.status).toBe(403);expect(readPreview).not.toHaveBeenCalled();});
