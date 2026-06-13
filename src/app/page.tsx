'use client';

import Link from 'next/link';
import PillNav from '@/components/layout/PillNav';
import BorderGlow from '@/components/ui/BorderGlow';

const NAV_ITEMS = [
  { label: 'Home',     href: '/'         },
  { label: 'Sign In',  href: '/login'    },
  { label: 'Register', href: '/register' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar — centered floating pill, ChainBill style */}
      <div className="sticky top-0 z-50 flex justify-center px-6 pt-4 pb-2">
        <div className="w-full max-w-2xl">
          <PillNav
            brandName="MediMap"
            items={NAV_ITEMS}
            activeHref="/"
            baseColor="#FFFFFF"
            pillColor="#1A1A2E"
            pillTextColor="#1A1A2E"
            hoveredPillTextColor="#FFFFFF"
            initialLoadAnimation
          />
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-16 pb-16 grid grid-cols-2 gap-16 items-center">
        <div>
          <h1 className="font-playfair text-5xl font-bold text-primary leading-tight mb-6">
            Your Health Records,<br />Finally Make Sense.
          </h1>
          <p className="text-muted text-lg mb-8 leading-relaxed">
            Upload your medical reports. Understand your values. Track your health over time — all in one place.
          </p>
          <div className="flex items-center gap-4 mb-10">
            <Link href="/register" className="btn-primary">Get Started Free</Link>
            <Link href="#how" className="btn-outline">See How It Works</Link>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <span>10,000+ Reports Analyzed</span>
            <span>Plain Language Insights</span>
            <span>Built for Indian Patients</span>
          </div>
        </div>

        {/* Mock report card */}
        <BorderGlow borderRadius={8} className="float-card shadow-sm">
        <div className="card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-playfair font-semibold text-primary">Complete Blood Count</p>
              <p className="text-xs text-muted">Apollo Diagnostics · 8 June 2025</p>
            </div>
            <span className="bg-status-amber/10 text-status-amber text-xs px-3 py-1 rounded-full border border-status-amber/20 font-medium">
              2 Abnormal
            </span>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Hemoglobin', value: '14.5 g/dL',   status: 'normal' },
              { name: 'WBC Count',  value: '10,570 /cmm',  status: 'high'   },
              { name: 'RBC Count',  value: '4.79 M/cmm',   status: 'normal' },
              { name: 'Platelets',  value: '2.1L /cmm',    status: 'normal' },
            ].map(row => (
              <div key={row.name} className="flex items-center justify-between py-2 border-b border-black/10 last:border-0">
                <span className="text-sm text-primary">{row.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-primary">{row.value}</span>
                  <span className={row.status === 'high' ? 'status-high' : 'status-normal'}>
                    {row.status === 'high' ? 'High' : 'Normal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-accent/5 border border-accent/20 rounded-md">
            <p className="text-xs text-accent font-medium">AI Analysis: Elevated WBC may indicate infection. Consider a follow-up in 4 weeks.</p>
          </div>
        </div>
        </BorderGlow>
      </section>

      {/* Problem — no background partition */}
      <section id="how" className="py-20">
        <div className="max-w-6xl mx-auto px-8">
          <p className="font-sans text-xs font-bold tracking-widest text-accent uppercase mb-3">The Problem</p>
          <h2 className="font-playfair text-3xl font-bold text-primary mb-12">
            Medical reports shouldn't require a medical degree.
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { title: 'Reports get lost',      desc: 'Scattered across clinics, WhatsApp chats, and random folders.' },
              { title: 'Numbers mean nothing',  desc: "HbA1c, WBC, TSH — without context, they're just numbers." },
              { title: 'Follow-ups get missed', desc: 'No one reminds you which tests are due and when.' },
            ].map((card, i) => (
              <BorderGlow key={card.title} borderRadius={8} className="float-card" style={{ animationDelay: `${i * 0.5}s` }}>
                <div className="card h-full">
                  <h3 className="font-sans font-semibold text-primary mb-2">{card.title}</h3>
                  <p className="text-sm text-muted">{card.desc}</p>
                </div>
              </BorderGlow>
            ))}
          </div>
        </div>
      </section>

      {/* Features — no background partition */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <p className="font-sans text-xs font-bold tracking-widest text-accent uppercase mb-3">What MediMap Does</p>
        <h2 className="font-playfair text-3xl font-bold text-primary mb-12">
          From uploaded report to full health picture.
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {[
            { title: 'Smart OCR Extraction',    desc: 'Upload any PDF or scan. We extract every value automatically using AI.' },
            { title: 'Plain Language Analysis',  desc: "AI explains what's abnormal, the risk level, and what you should do next." },
            { title: 'Longitudinal Tracking',    desc: 'See how your hemoglobin, glucose, and TSH trend over 3M, 6M, 1Y.' },
            { title: 'Test Gap Detection',       desc: "Based on your conditions, we tell you which tests you're missing and when they're due." },
          ].map((f, i) => (
            <BorderGlow key={f.title} borderRadius={8} className="float-card" style={{ animationDelay: `${i * 0.4}s` }}>
              <div className="card flex gap-4 h-full">
                <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent flex-shrink-0" />
                <div>
                  <h3 className="font-sans font-semibold text-primary mb-1">{f.title}</h3>
                  <p className="text-sm text-muted">{f.desc}</p>
                </div>
              </div>
            </BorderGlow>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2d1f5e] text-white py-12 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-playfair text-xl font-bold">MediMap</span>
            <p className="text-sm text-white/60 mt-1">Health intelligence for every patient.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Get Started</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/10 text-xs text-white/40">
          Built for patients in Hyderabad, India. Not a substitute for professional medical advice.
        </div>
      </footer>
    </div>
  );
}
