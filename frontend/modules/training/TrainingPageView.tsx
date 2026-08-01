"use client";

import { useState } from "react";
import { TrainingSizingView } from "./TrainingSizingView";
import { RLPostTrainingView } from "./RLPostTrainingView";
import { FinetuningView } from "./FinetuningView";

type Tab = "pretraining" | "rl" | "finetuning";

const TAB_META: Record<Tab, { label: string; title: string; tagline: string }> = {
  pretraining: {
    label: "LLM Pretraining",
    title: "LLM Pretraining Sizing",
    tagline: "Size the GPU cluster for pretraining or SFT from first principles — compute, memory, comms, storage, and power.",
  },
  rl: {
    label: "RL Post-Training",
    title: "RL / Post-Training Sizing",
    tagline: "Size the rollout + train two-cluster system behind PPO, GRPO/RLOO, DPO, and RFT post-training runs.",
  },
  finetuning: {
    label: "Fine-Tuning",
    title: "Fine-Tuning Sizing",
    tagline: "Size PEFT and full fine-tuning runs across methods, modalities, and domains — does it fit, and on how many GPUs.",
  },
};

export function TrainingPageView() {
  const [tab, setTab] = useState<Tab>("pretraining");

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-20">

        {/* ── header ── */}
        <div className="mb-6">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">{TAB_META[tab].title}</h1>
          <p className="text-[13px] text-white/40 max-w-2xl">{TAB_META[tab].tagline}</p>
        </div>

        {/* ── tab bar ── */}
        <div className="flex gap-1 mb-8 border-b border-white/[0.07]">
          {(Object.keys(TAB_META) as Tab[]).map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              className="px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2"
              style={{
                color: tab === t ? "#818cf8" : "var(--dm-txt-faint)",
                borderColor: tab === t ? "#818cf8" : "transparent",
              }}
            >
              {TAB_META[t].label}
            </button>
          ))}
        </div>

        {tab === "pretraining" && <TrainingSizingView />}
        {tab === "rl" && <RLPostTrainingView />}
        {tab === "finetuning" && <FinetuningView />}
      </div>
    </main>
  );
}
