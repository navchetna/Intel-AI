import { InferenceSubNav } from "@/modules/inference";

export default function InferenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InferenceSubNav />
      {children}
    </>
  );
}
