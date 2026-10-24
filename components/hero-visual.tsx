"use client";

import { motion } from "motion/react";
import { Check, Cpu, Database, ShieldCheck, Sparkles } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative min-h-[390px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="absolute inset-x-0 top-4 rounded-[2rem] border border-white/12 bg-white/8 p-5 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">
              PHÂN TÍCH NHU CẦU
            </p>
            <p className="mt-1 font-bold text-white">
              Shop mỹ phẩm · 50K visits
            </p>
          </div>
          <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-bold text-mint">
            AI local
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Ngân sách", "600K"],
            ["Loại", "E-commerce"],
            ["Độ tin cậy", "92%"],
          ].map(([a, b]) => (
            <div key={a} className="rounded-2xl bg-white/8 p-3">
              <p className="text-[10px] text-slate-400">{a}</p>
              <p className="mt-1 text-sm font-extrabold text-white">{b}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-white p-4 text-ink">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black text-blue">PHÙ HỢP NHẤT</p>
              <h2 className="mt-1 text-xl font-black">Cloud Startup</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
              91 điểm
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
            <span className="flex gap-1">
              <Check size={14} className="text-emerald-600" />
              100 GB NVMe
            </span>
            <span className="flex gap-1">
              <Check size={14} className="text-emerald-600" />
              Daily backup
            </span>
          </div>
        </div>
      </motion.div>
      {[
        { icon: Cpu, label: "Qwen 9.7B", pos: "-left-7 top-10" },
        { icon: Database, label: "RAG có nguồn", pos: "-right-5 bottom-16" },
        {
          icon: ShieldCheck,
          label: "Dữ liệu tại máy",
          pos: "left-8 -bottom-2",
        },
      ].map(({ icon: Icon, label, pos }, i) => (
        <motion.div
          key={label}
          className={`absolute ${pos} flex items-center gap-2 rounded-full border border-white/15 bg-[#152440] px-3 py-2 text-xs font-bold text-white shadow-xl`}
          animate={{ y: [0, -7, 0] }}
          transition={{ repeat: Infinity, duration: 3 + i * 0.6 }}
        >
          <Icon size={15} className="text-mint" />
          {label}
        </motion.div>
      ))}
      <Sparkles className="absolute right-4 top-0 text-cyan" />
    </div>
  );
}
