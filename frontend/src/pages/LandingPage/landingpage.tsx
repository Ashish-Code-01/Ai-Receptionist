import { useState } from "react";
import type { ElementType, ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowRight, BarChart3, Bell, Bot, CalendarCheck, Check, ChevronDown, Clock3,
  HeartPulse, Menu, MessageCircle, Monitor, Phone, Play, QrCode, Sparkles,
  Star, Stethoscope, Users, X, Zap,
} from "lucide-react";

/* ============================ DATA ============================ */

const NAV = ["Features", "How it works", "Pricing", "FAQ"];
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

const features = [
  {
    icon: CalendarCheck, title: "Smart Appointments", large: true,
    description: "Let patients discover available slots and book appointments without calling your reception."
  },
  {
    icon: Bot, title: "AI Receptionist",
    description: "Answer common patient questions instantly with an intelligent AI receptionist."
  },
  {
    icon: Clock3, title: "Token & Queue",
    description: "Generate token numbers automatically and keep your waiting room organized."
  },
  {
    icon: Bell, title: "Live Notifications",
    description: "Notify patients when their appointment or token is approaching."
  },
  {
    icon: QrCode, title: "QR Booking",
    description: "Place one QR code at your clinic and let patients book instantly."
  },
  {
    icon: BarChart3, title: "Clinic Analytics",
    description: "Track appointments, patients, revenue and clinic activity from one dashboard."
  },
];

const steps = [
  {
    icon: QrCode, title: "Patient scans QR",
    description: "Patients scan your clinic QR code from the reception, desk or waiting area."
  },
  {
    icon: MessageCircle, title: "AI handles the request",
    description: "The AI receptionist answers questions and guides the patient through booking."
  },
  {
    icon: CalendarCheck, title: "Appointment confirmed",
    description: "The patient receives confirmation and a token number automatically."
  },
];

const faqs = [
  {
    q: "What is an AI Receptionist?",
    a: "AI Receptionist is a digital receptionist designed for clinics and healthcare businesses. It helps automate appointment booking, patient questions, token management and common reception workflows."
  },
  {
    q: "Can patients book appointments using a QR code?",
    a: "Yes. Each clinic can have a dedicated QR code that patients can scan to open the booking experience."
  },
  {
    q: "Does it support token numbers?",
    a: "Yes. The system can generate token numbers in sequence and reset the queue automatically each day."
  },
  {
    q: "Can I manage multiple doctors?",
    a: "Yes. The dashboard can be structured around multiple doctors, their schedules and their appointments."
  },
  {
    q: "Do I need technical knowledge?",
    a: "No. The product is designed for clinic owners and reception teams rather than developers."
  },
];

const plans = [
  {
    name: "Starter", price: "₹999", desc: "For individual doctors and small clinics.",
    items: ["Appointment booking", "QR booking", "Token management", "Basic dashboard"]
  },
  {
    name: "Growth", price: "₹2,499", desc: "For growing clinics that need automation.", popular: true,
    items: ["Everything in Starter", "AI receptionist", "Patient notifications", "Analytics", "Multiple doctors"]
  },
  {
    name: "Clinic Pro", price: "₹4,999", desc: "For advanced clinics and larger teams.",
    items: ["Everything in Growth", "Advanced analytics", "Priority support", "Custom workflows", "Multi-location support"]
  },
];

// TODO: replace with real customer quotes before launch.
const testimonials = [
  {
    quote: "The biggest improvement was reducing the number of repetitive calls our reception team had to handle.",
    name: "Dr. Ananya Mehta", role: "Dental Clinic"
  },
  {
    quote: "Patients can scan the QR and book without waiting at the reception. It makes the clinic feel much more modern.",
    name: "Dr. Rahul Shah", role: "Private Practice"
  },
  {
    quote: "The live queue makes the waiting experience much easier for both our staff and patients.",
    name: "Dr. Priya Nair", role: "Multi-doctor Clinic"
  },
];

const footerCols: Record<string, string[]> = {
  Product: ["Features", "Pricing", "Dashboard", "AI Receptionist"],
  Company: ["About", "Contact", "Careers", "Privacy"],
  Support: ["Help Center", "Documentation", "Contact Support", "FAQ"],
};

/* =========================== HELPERS =========================== */

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const inView = { once: true, amount: 0.2 } as const;

const btnPrimary =
  "group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary font-bold text-brand-on-primary shadow-[0_14px_35px_rgba(232,89,12,0.25)] transition-all hover:-translate-y-1 hover:bg-brand-primary-hover";

function SectionBadge({ children, icon: Icon = Sparkles, tone = "light" }: {
  children: ReactNode; icon?: ElementType; tone?: "light" | "dark";
}) {
  const cls = tone === "dark"
    ? "border-white/15 bg-white/10 text-brand-on-dark"
    : "border-brand-accent-border bg-brand-accent-bg text-brand-text-h";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${cls}`}>
      <Icon size={14} className="text-brand-accent" />
      {children}
    </div>
  );
}

function SectionHeader({ badge, icon, title, accent, sub }: {
  badge: string; icon?: ElementType; title: ReactNode; accent?: string; sub?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <SectionBadge icon={icon}>{badge}</SectionBadge>
      <h2 className="mt-6 text-4xl font-black tracking-tight text-brand-text-h sm:text-5xl">
        {title}
        {accent && <span className="text-brand-primary"> {accent}</span>}
      </h2>
      {sub && <p className="mt-5 text-base leading-8 text-brand-muted">{sub}</p>}
    </div>
  );
}

function Container({ children, max = "max-w-7xl" }: { children: ReactNode; max?: string }) {
  return <div className={`mx-auto ${max} px-4 sm:px-6 lg:px-8`}>{children}</div>;
}

function Logo({ small = false }: { small?: boolean }) {
  return (
    <a href="#" className="flex items-center gap-3" aria-label="AI Receptionist home">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-brand-on-primary shadow-[0_8px_20px_rgba(232,89,12,0.2)]">
        <HeartPulse size={20} />
      </div>
      <div>
        <p className="text-sm font-extrabold tracking-tight text-brand-text-h">AI Receptionist</p>
        {!small && <p className="text-[11px] font-medium text-brand-muted">Smart clinic automation</p>}
      </div>
    </a>
  );
}

function FakeQR() {
  const n = 21;
  const cells: ReactNode[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      let on: boolean;
      if (finder) {
        const lx = x > 13 ? x - 14 : x;
        const ly = y > 13 ? y - 14 : y;
        const edge = lx === 0 || lx === 6 || ly === 0 || ly === 6;
        const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
        on = edge || core;
      } else {
        on = (x * 7 + y * 13 + x * y) % 5 < 2;
      }
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="h-full w-full" fill="#2B2118" shapeRendering="crispEdges" aria-hidden>
      {cells}
    </svg>
  );
}

/* ======================= DASHBOARD MOCKUP ======================= */

const queue = [
  ["#A-021", "Rahul Sharma", "10:30 AM", "Waiting"],
  ["#A-022", "Priya Patel", "10:45 AM", "In consultation"],
  ["#A-023", "Amit Shah", "11:00 AM", "Confirmed"],
  ["#A-024", "Sneha Mehta", "11:15 AM", "Confirmed"],
];

const statusCls: Record<string, string> = {
  "In consultation": "bg-brand-accent-bg text-brand-text-h",
  Waiting: "bg-[rgba(232,89,12,0.10)] text-brand-primary",
  Confirmed: "bg-[rgba(47,158,68,0.10)] text-brand-secondary",
};

function DashboardMockup({ compact = false }: { compact?: boolean }) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const sidebar = [
    { icon: Monitor, label: "Overview", active: true },
    { icon: CalendarCheck, label: "Appointments" },
    { icon: Users, label: "Patients" },
    { icon: Clock3, label: "Queue" },
    { icon: BarChart3, label: "Analytics" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="absolute -inset-10 -z-10 rounded-[4rem] bg-brand-primary opacity-[0.08] blur-3xl" />
      <div className="overflow-hidden rounded-[28px] border border-brand-border bg-brand-surface shadow-[0_30px_100px_rgba(43,33,24,0.16)]">
        <div className="flex h-12 items-center justify-between border-b border-brand-border bg-brand-bg px-5">
          <div className="flex items-center gap-2" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#FF6B6B]" />
            <span className="h-3 w-3 rounded-full bg-[#FFD43B]" />
            <span className="h-3 w-3 rounded-full bg-[#51CF66]" />
          </div>
          <div className="hidden rounded-lg border border-brand-border bg-brand-surface px-12 py-1.5 text-xs text-brand-muted sm:block">
            app.aireceptionist.com/dashboard
          </div>
          <div className="w-16" />
        </div>

        <div className={`grid grid-cols-1 ${compact ? "" : "min-h-[540px] md:grid-cols-[200px_1fr]"}`}>
          {!compact && (
            <aside className="hidden border-r border-brand-border bg-brand-bg p-4 md:block">
              <div className="mb-7 flex items-center gap-2 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-brand-on-primary">
                  <HeartPulse size={17} />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-text-h">AI Receptionist</p>
                  <p className="text-[11px] text-brand-muted">Clinic OS</p>
                </div>
              </div>
              <div className="space-y-1">
                {sidebar.map(({ icon: Icon, label, active }) => (
                  <div key={label}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium ${active ? "bg-brand-primary text-brand-on-primary" : "text-brand-muted"}`}>
                    <Icon size={15} />
                    {label}
                  </div>
                ))}
              </div>
            </aside>
          )}

          <div className="bg-brand-surface p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">{today}</p>
                <h3 className="mt-1 text-xl font-bold text-brand-text-h">Good morning, Doctor 👋</h3>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-brand-bg">
                <Bell size={16} className="text-brand-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[["Today's Appointments", "28", "+12%"], ["Patients", "164", "+8%"],
              ["Waiting", "07", "-4%"], ["Completed", "21", "+16%"]].map(([label, value, change]) => (
                <div key={label} className="rounded-2xl border border-brand-border bg-brand-bg p-4">
                  <p className="text-xs font-medium text-brand-muted">{label}</p>
                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-2xl font-bold text-brand-text-h">{value}</p>
                    <span className="text-xs font-semibold text-brand-secondary">{change}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={`mt-5 grid gap-5 ${compact ? "" : "lg:grid-cols-[1.4fr_0.8fr]"}`}>
              <div className="rounded-2xl border border-brand-border bg-brand-bg p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-brand-text-h">Today&apos;s Queue</h4>
                    <p className="text-xs text-brand-muted">Live patient queue</p>
                  </div>
                  <span className="rounded-full bg-brand-accent-bg px-2 py-1 text-[11px] font-semibold text-brand-text-h">LIVE</span>
                </div>
                <div className="space-y-2">
                  {queue.map(([token, name, time, status]) => (
                    <div key={token} className="flex items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-surface p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-brand-code-bg text-[11px] font-bold text-brand-primary">{token}</div>
                        <div>
                          <p className="text-xs font-semibold text-brand-text-h">{name}</p>
                          <p className="text-[11px] text-brand-muted">{time}</p>
                        </div>
                      </div>
                      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${statusCls[status]}`}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!compact && (
                <div className="rounded-2xl bg-brand-dark-bg p-5 text-brand-on-dark">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary"><Bot size={19} /></div>
                    <div>
                      <p className="text-sm font-bold">AI Receptionist</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-secondary" />
                        <span className="text-[11px] text-brand-on-dark-muted">Online &amp; responding</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-xs leading-relaxed">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-brand-primary p-3">Hi, I want to book an appointment for tomorrow.</div>
                    <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-white/10 p-3 text-[#EADFD3]">Absolutely! Dr. Sharma has slots available at 10:30 AM, 11:15 AM and 12:00 PM.</div>
                    <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-md bg-brand-primary p-3">11:15 AM works for me.</div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                    <span className="flex-1 px-2 text-[11px] text-[#8F8378]">Type a message...</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary"><ArrowRight size={13} /></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ NAVBAR ============================ */

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <Container>
        <nav className="mt-4 flex items-center justify-between rounded-2xl border border-brand-border bg-brand-nav-bg px-4 py-3 shadow-[0_10px_30px_rgba(43,33,24,0.06)] backdrop-blur-xl">
          <Logo />
          <div className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <a key={item} href={`#${slug(item)}`}
                className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-primary">{item}</a>
            ))}
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <a href="/login" className="px-3 py-2 text-sm font-semibold text-brand-text transition-colors hover:text-brand-primary">Login</a>
            <a href="#demo" className={`${btnPrimary} px-4 py-2.5 text-sm !rounded-xl !shadow-[0_8px_20px_rgba(232,89,12,0.2)]`}>Get Started</a>
          </div>
          <button onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border text-brand-text-h md:hidden">
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mt-2 rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-xl md:hidden">
              <div className="space-y-1">
                {NAV.map((item) => (
                  <a key={item} href={`#${slug(item)}`} onClick={() => setOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-brand-text hover:bg-brand-bg hover:text-brand-primary">{item}</a>
                ))}
                <a href="#demo" onClick={() => setOpen(false)}
                  className="mt-2 block rounded-xl bg-brand-primary px-4 py-3 text-center text-sm font-bold text-brand-on-primary">Get Started</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </header>
  );
}

/* ============================== HERO ============================== */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-bg pt-36 pb-20 lg:pt-44 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-[-10%] top-20 h-[500px] w-[500px] rounded-full bg-brand-primary opacity-[0.07] blur-[120px]" />
        <div className="absolute right-[-10%] top-32 h-[450px] w-[450px] rounded-full bg-brand-accent opacity-[0.07] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: "linear-gradient(var(--text-h) 1px, transparent 1px), linear-gradient(90deg, var(--text-h) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "linear-gradient(to bottom, black 40%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent)",
        }} />
      </div>

      <div className="relative">
        <Container>
          <motion.div initial="hidden" animate="visible" variants={stagger}
            className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <motion.div variants={fadeUp}><SectionBadge>The future of clinic reception</SectionBadge></motion.div>

            <motion.h1 variants={fadeUp}
              className="mt-7 text-5xl font-black tracking-[-0.05em] text-brand-text-h sm:text-6xl lg:text-7xl">
              Your clinic&apos;s
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-brand-primary">AI receptionist.</span>
                <span className="absolute -bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-brand-accent opacity-30" />
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-base leading-8 text-brand-muted sm:text-lg">
              Automate appointments, patient questions, token queues and reception workflows with one intelligent platform built for modern healthcare.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#demo" className={`${btnPrimary} w-full px-6 py-4 text-sm sm:w-auto`}>
                Start Free <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#demo"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-surface px-6 py-4 text-sm font-bold text-brand-text-h shadow-sm transition-all hover:-translate-y-1 hover:border-brand-primary sm:w-auto">
                <Play size={15} fill="currentColor" className="text-brand-primary" /> Watch Demo
              </a>
            </motion.div>

            <motion.div variants={fadeUp}
              className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-brand-muted">
              {["No credit card", "15-day free trial", "Setup in minutes"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check size={13} className="text-brand-secondary" /> {item}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8, ease }} className="mt-16 lg:mt-20">
            <DashboardMockup />
          </motion.div>
        </Container>
      </div>
    </section>
  );
}

/* ========================== TRUST STRIP ========================== */

function TrustStrip() {
  return (
    <section className="border-y border-brand-border bg-brand-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-7 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-brand-muted sm:text-left">Built for modern healthcare teams</p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Doctors", "Dental Clinics", "Diagnostic Centers", "Multi-doctor Clinics", "Small Hospitals"].map((item) => (
            <span key={item} className="rounded-full border border-brand-border bg-brand-bg px-3 py-1.5 text-xs font-semibold text-brand-text">{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================= PROBLEM ============================= */

function ProblemSection() {
  const calls = [
    ["Appointment request", "2 min ago", "Incoming"],
    ["Patient question", "7 min ago", "Answered"],
    ["Reschedule request", "11 min ago", "Pending"],
    ["New booking", "16 min ago", "Confirmed"],
  ];
  return (
    <section className="bg-brand-bg py-24 lg:py-32">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <motion.div initial="hidden" whileInView="visible" viewport={inView} variants={stagger}>
            <motion.div variants={fadeUp}><SectionBadge icon={Zap}>Reception, reimagined</SectionBadge></motion.div>
            <motion.h2 variants={fadeUp} className="mt-6 text-4xl font-black tracking-tight text-brand-text-h sm:text-5xl">
              Your reception team shouldn&apos;t spend the day doing
              <span className="text-brand-primary"> repetitive work.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-8 text-brand-muted">
              Calls, appointment requests, patient questions and waiting-room queues create unnecessary pressure for clinic teams.
            </motion.p>
            <motion.ul variants={fadeUp} className="mt-8 space-y-4">
              {["Patients waiting for a response", "Receptionists handling repetitive calls",
                "Manual token and queue management", "Missed appointments and follow-ups"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(232,89,12,0.10)]">
                      <X size={14} className="text-brand-primary" />
                    </span>
                    <span className="text-sm font-medium text-brand-text">{item}</span>
                  </li>
                ))}
            </motion.ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={inView}
            transition={{ duration: 0.7 }} className="relative">
            <div className="absolute -inset-8 rounded-[3rem] bg-brand-accent opacity-[0.06] blur-3xl" />
            <div className="relative rounded-[30px] border border-brand-border bg-brand-surface p-5 shadow-[0_25px_80px_rgba(43,33,24,0.10)]">
              <div className="flex items-center justify-between border-b border-brand-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(232,89,12,0.10)]">
                    <Phone size={18} className="text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-text-h">Reception calls</p>
                    <p className="text-xs text-brand-muted">Today&apos;s activity</p>
                  </div>
                </div>
                <span className="rounded-full bg-[rgba(47,158,68,0.10)] px-2.5 py-1 text-[11px] font-bold text-brand-secondary">LIVE</span>
              </div>
              <div className="mt-5 space-y-3">
                {calls.map(([title, time, status], i) => (
                  <motion.div key={title} initial={{ opacity: 0, x: 15 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                    className="flex items-center justify-between rounded-2xl border border-brand-border bg-brand-bg p-3.5">
                    <div>
                      <p className="text-sm font-bold text-brand-text-h">{title}</p>
                      <p className="mt-1 text-xs text-brand-muted">{time}</p>
                    </div>
                    <span className="rounded-full bg-brand-accent-bg px-2.5 py-1 text-[11px] font-semibold text-brand-text-h">{status}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ============================ FEATURES ============================ */

function FeaturesSection() {
  return (
    <section id="features" className="bg-brand-surface py-24 lg:py-32">
      <Container>
        <SectionHeader badge="Everything reception needs"
          title={<>One intelligent system.<br /><span className="text-brand-primary">Your entire reception.</span></>}
          sub="Replace disconnected tools and repetitive workflows with one simple healthcare automation platform." />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={stagger}
          className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, large }) => (
            <motion.div key={title} variants={fadeUp}
              className={`group relative overflow-hidden rounded-[26px] border border-brand-border bg-brand-bg p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(232,89,12,0.25)] hover:shadow-[0_20px_50px_rgba(43,33,24,0.08)] ${large ? "lg:col-span-2" : ""}`}>
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-primary opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.08]" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(232,89,12,0.10)] text-brand-primary transition-all duration-300 group-hover:bg-brand-primary group-hover:text-brand-on-primary">
                  <Icon size={21} />
                </div>
                <h3 className="mt-6 text-lg font-bold text-brand-text-h">{title}</h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-brand-muted">{description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

/* =========================== HOW IT WORKS =========================== */

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-brand-bg py-24 lg:py-32">
      <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-brand-secondary opacity-[0.04] blur-[120px]" aria-hidden />
      <div className="relative">
        <Container>
          <SectionHeader badge="Simple by design" icon={Zap} title="From QR scan to" accent="appointment."
            sub="No complicated workflows. Patients can move from discovery to booking in just a few steps." />
          <div className="relative mt-16 grid gap-10 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-16 hidden border-t border-dashed border-brand-border md:block" aria-hidden />
            {steps.map(({ icon: Icon, title, description }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={inView} transition={{ delay: i * 0.12, duration: 0.6 }} className="relative text-center">
                <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-brand-border bg-brand-surface shadow-[0_15px_40px_rgba(43,33,24,0.08)]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary text-brand-on-primary shadow-[0_10px_25px_rgba(232,89,12,0.22)]">
                    <Icon size={26} />
                  </div>
                  <span className="absolute -right-1 top-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-brand-bg bg-brand-accent text-xs font-black text-[#2B2118]">{i + 1}</span>
                </div>
                <h3 className="mt-7 text-lg font-bold text-brand-text-h">{title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-brand-muted">{description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}

/* ============================ DASHBOARD ============================ */

function DashboardSection() {
  return (
    <section className="bg-brand-dark-bg py-24 lg:py-32">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionBadge icon={BarChart3} tone="dark">One dashboard. Total control.</SectionBadge>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-brand-on-dark sm:text-5xl">
              See your entire clinic<span className="text-brand-primary"> at a glance.</span>
            </h2>
            <p className="mt-5 text-base leading-8 text-brand-on-dark-muted">
              Monitor appointments, patients, queues and reception activity without switching between multiple systems.
            </p>
            <ul className="mt-8 space-y-4">
              {["Real-time appointment overview", "Live token and waiting queue",
                "Patient activity tracking", "Clinic performance analytics"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(81,207,102,0.12)]">
                      <Check size={13} className="text-[#51CF66]" />
                    </span>
                    <span className="text-sm font-medium text-[#EADFD3]">{item}</span>
                  </li>
                ))}
            </ul>
            <a href="#demo" className={`${btnPrimary} mt-9 px-5 py-3 text-sm !rounded-xl !shadow-none`}>
              Explore Dashboard <ArrowRight size={16} />
            </a>
          </div>
          <DashboardMockup compact />
        </div>
      </Container>
    </section>
  );
}

/* ========================= AI RECEPTIONIST ========================= */

function AIReceptionistSection() {
  const slots = ["10:30 AM", "11:15 AM", "12:00 PM"];
  const [picked, setPicked] = useState<string | null>(null);
  const bubble = "rounded-2xl border border-brand-border bg-brand-surface p-4 text-sm leading-6 text-brand-text";
  const mine = "ml-auto rounded-2xl rounded-tr-md bg-brand-primary p-4 text-sm leading-6 text-brand-on-primary";

  return (
    <section className="bg-brand-surface py-24 lg:py-32">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={inView} transition={{ duration: 0.7 }}>
            <div className="overflow-hidden rounded-[30px] border border-brand-border bg-brand-bg shadow-[0_25px_70px_rgba(43,33,24,0.10)]">
              <div className="flex items-center gap-3 border-b border-brand-border bg-brand-surface p-5">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary text-brand-on-primary">
                  <Bot size={20} />
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-brand-surface bg-brand-secondary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text-h">AI Receptionist</p>
                  <p className="text-xs text-brand-secondary">Online • Ready to help</p>
                </div>
              </div>

              <div className="space-y-4 p-5" aria-live="polite">
                <div className={`${bubble} max-w-[85%] rounded-tl-md`}>
                  Hello! 👋 I&apos;m the virtual receptionist for Dr. Sharma&apos;s clinic. How can I help you today?
                </div>
                <div className={`${mine} max-w-[80%]`}>I need an appointment for tomorrow.</div>
                <div className={`${bubble} max-w-[90%] rounded-tl-md`}>
                  Sure! I found 3 available slots. Pick one:
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {slots.map((t) => (
                      <button key={t} onClick={() => setPicked(t)} aria-pressed={picked === t}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${picked === t
                            ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                            : "border-brand-border bg-brand-bg text-brand-text-h hover:border-brand-primary hover:text-brand-primary"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {picked && (
                  <>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`${mine} max-w-[70%]`}>
                      {picked} works!
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-[rgba(47,158,68,0.25)] bg-[rgba(47,158,68,0.08)] p-4">
                      <div className="flex items-center gap-2">
                        <Check size={15} className="text-brand-secondary" />
                        <p className="text-sm font-bold text-brand-text-h">Appointment confirmed</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-brand-muted">Dr. Sharma • Tomorrow • {picked}</p>
                    </motion.div>
                  </>
                )}
              </div>

              <div className="border-t border-brand-border bg-brand-surface p-4">
                <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-brand-bg p-2">
                  <div className="flex-1 px-2 text-xs text-brand-muted">Ask anything...</div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-brand-on-primary"><ArrowRight size={14} /></div>
                </div>
              </div>
            </div>
          </motion.div>

          <div>
            <SectionBadge icon={Bot}>Always-on AI receptionist</SectionBadge>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-brand-text-h sm:text-5xl">
              Your patients get answers.<br />
              <span className="text-brand-primary">Your team gets time back.</span>
            </h2>
            <p className="mt-5 text-base leading-8 text-brand-muted">
              Let AI handle repetitive reception conversations while your staff focuses on patients inside the clinic.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { icon: MessageCircle, title: "Patient questions", text: "Answer common clinic questions instantly." },
                { icon: CalendarCheck, title: "Appointments", text: "Guide patients through available slots." },
                { icon: Clock3, title: "Queue updates", text: "Keep patients updated about their token." },
                { icon: Phone, title: "Reception support", text: "Reduce repetitive calls and interruptions." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-brand-border bg-brand-bg p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(232,89,12,0.10)] text-brand-primary"><Icon size={17} /></div>
                  <h3 className="mt-4 text-sm font-bold text-brand-text-h">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ============================== CLINIC ============================== */

function ClinicSection() {
  return (
    <section className="bg-brand-bg py-24 lg:py-32">
      <Container>
        <div className="overflow-hidden rounded-[36px] bg-[#E8590C]">
          <div className="grid items-center lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                <Stethoscope size={14} /> Made for healthcare
              </div>
              <h2 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Give your clinic a more modern patient experience.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/80">
                Put one simple QR code at your reception and give patients a faster way to book appointments, get information and manage their visit.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {["QR booking", "Token system", "Patient dashboard", "AI receptionist"].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3">
                    <Check size={14} className="text-[#FFD43B]" />
                    <span className="text-xs font-semibold text-white">{item}</span>
                  </div>
                ))}
              </div>
              <a href="#demo" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#E8590C] transition hover:bg-[#FFF8F0]">
                Create your clinic <ArrowRight size={16} />
              </a>
            </div>

            <div className="relative flex min-h-[420px] flex-col items-center justify-center gap-6 overflow-hidden bg-black/10 p-8 lg:block">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#F59F00] opacity-20 blur-3xl" aria-hidden />
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-[250px] rounded-3xl border border-white/15 bg-[#2A221B] p-5 shadow-2xl lg:absolute lg:left-[12%] lg:top-[15%]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Dr. Sharma Clinic</p>
                    <p className="mt-1 text-[11px] text-white/60">Scan to book</p>
                  </div>
                  <QrCode size={24} className="text-[#FFD43B]" />
                </div>
                <div className="mx-auto mt-5 h-40 w-40 rounded-2xl bg-white p-3"><FakeQR /></div>
              </motion.div>

              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-[200px] rounded-2xl border border-white/10 bg-[#FFF8F0] p-4 shadow-2xl lg:absolute lg:bottom-[10%] lg:right-[8%]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#7A6E64]">Current token</span>
                  <span className="h-2 w-2 rounded-full bg-[#51CF66]" />
                </div>
                <p className="mt-2 text-3xl font-black text-[#2B2118]">A-024</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EADFD3]">
                  <div className="h-full w-[72%] rounded-full bg-[#E8590C]" />
                </div>
                <p className="mt-2 text-[11px] text-[#7A6E64]">3 patients ahead</p>
              </motion.div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* =========================== BEFORE / AFTER =========================== */

function BeforeAfter() {
  const before = ["Constant phone calls", "Manual appointment entries", "Patients asking for queue status", "Paper/token confusion", "Receptionist overloaded"];
  const after = ["AI answers common questions", "Patients book online", "Live token updates", "Automated queue management", "Reception focuses on patients"];
  return (
    <section className="bg-brand-surface py-24 lg:py-32">
      <Container max="max-w-6xl">
        <SectionHeader badge="Less chaos. More control." icon={Zap} title="Upgrade the way your clinic works." />
        <div className="mt-14 grid overflow-hidden rounded-[30px] border border-brand-border md:grid-cols-2">
          <div className="bg-brand-bg p-7 sm:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(232,89,12,0.10)]"><X size={18} className="text-brand-primary" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">Before</p>
                <h3 className="text-lg font-bold text-brand-text-h">Manual reception</h3>
              </div>
            </div>
            <ul className="mt-7 space-y-3">
              {before.map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface p-3">
                  <X size={14} className="shrink-0 text-brand-primary" />
                  <span className="text-sm text-brand-text">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-brand-dark-bg p-7 sm:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(81,207,102,0.14)]"><Check size={18} className="text-[#51CF66]" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#51CF66]">After</p>
                <h3 className="text-lg font-bold text-white">AI-powered reception</h3>
              </div>
            </div>
            <ul className="mt-7 space-y-3">
              {after.map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <Check size={14} className="shrink-0 text-[#51CF66]" />
                  <span className="text-sm text-[#EADFD3]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ============================== PRICING ============================== */

function PricingSection() {
  return (
    <section id="pricing" className="bg-brand-bg py-24 lg:py-32">
      <Container>
        <SectionHeader badge="Simple pricing" icon={Zap} title="Start small." accent="Scale when ready."
          sub="Choose the plan that matches your clinic today. Upgrade as your practice grows." />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`relative rounded-[28px] border bg-brand-surface p-7 ${plan.popular ? "border-brand-primary shadow-[0_20px_60px_rgba(232,89,12,0.12)]" : "border-brand-border"}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-primary px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-brand-on-primary">
                  Most popular
                </div>
              )}
              <p className="text-base font-bold text-brand-text-h">{plan.name}</p>
              <p className="mt-2 text-sm leading-6 text-brand-muted">{plan.desc}</p>
              <div className="mt-7 flex items-end gap-1">
                <span className="text-4xl font-black tracking-tight text-brand-text-h">{plan.price}</span>
                <span className="pb-1 text-sm text-brand-muted">/month</span>
              </div>
              <a href="#demo"
                className={`mt-7 block rounded-xl px-4 py-3 text-center text-sm font-bold transition ${plan.popular
                    ? "bg-brand-primary text-brand-on-primary hover:bg-brand-primary-hover"
                    : "border border-brand-border bg-brand-bg text-brand-text-h hover:border-brand-primary hover:text-brand-primary"}`}>
                Get started
              </a>
              <div className="mt-7 border-t border-brand-border pt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Includes</p>
                <ul className="mt-4 space-y-3">
                  {plan.items.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(47,158,68,0.10)]">
                        <Check size={11} className="text-brand-secondary" />
                      </span>
                      <span className="text-sm text-brand-text">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ============================ TESTIMONIALS ============================ */

function Testimonials() {
  return (
    <section className="bg-brand-surface py-24 lg:py-32">
      <Container>
        <SectionHeader badge="Loved by clinic teams" icon={HeartPulse} title="Built around the" accent="real clinic." />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-[26px] border border-brand-border bg-brand-bg p-6">
              <div className="flex gap-1" aria-label="5 out of 5 stars">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} fill="currentColor" className="text-brand-accent" />)}
              </div>
              <blockquote className="mt-6 text-sm leading-7 text-brand-text">“{t.quote}”</blockquote>
              <figcaption className="mt-7 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-brand-on-primary">
                  {t.name.replace("Dr. ", "").split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text-h">{t.name}</p>
                  <p className="text-xs text-brand-muted">{t.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ================================ FAQ ================================ */

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-brand-bg py-24 lg:py-32">
      <Container max="max-w-3xl">
        <SectionHeader badge="Frequently asked questions" icon={MessageCircle} title="Questions?" accent="We've got answers." />
        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={faq.q} className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
                <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} aria-controls={`faq-${i}`}
                  className="flex w-full items-center justify-between gap-5 p-5 text-left">
                  <span className="text-sm font-bold text-brand-text-h sm:text-base">{faq.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-brand-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <p className="border-t border-brand-border px-5 pb-5 pt-4 text-sm leading-7 text-brand-muted">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/* ============================== FINAL CTA ============================== */

function FinalCTA() {
  return (
    <section id="demo" className="bg-brand-bg px-4 pb-24 sm:px-6 lg:pb-32">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[36px] bg-brand-dark-bg px-6 py-16 text-center sm:px-12 lg:px-20 lg:py-20">
          <div className="absolute left-[-100px] top-[-100px] h-80 w-80 rounded-full bg-brand-primary opacity-20 blur-[100px]" aria-hidden />
          <div className="absolute bottom-[-150px] right-[-100px] h-96 w-96 rounded-full bg-brand-accent opacity-10 blur-[120px]" aria-hidden />
          <div className="relative mx-auto max-w-3xl">
            <SectionBadge tone="dark">Ready to modernize?</SectionBadge>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn your reception into your<span className="text-brand-primary"> smartest employee.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-brand-on-dark-muted">
              Give your clinic a faster, smarter and more modern patient experience with AI Receptionist.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="/signup" className={`${btnPrimary} w-full px-7 py-4 text-sm sm:w-auto`}>
                Start Free Trial <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a href="/contact"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10 sm:w-auto">
                Talk to us <MessageCircle size={16} />
              </a>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[#A39588]">
              <span>15-day free trial</span><span aria-hidden>•</span>
              <span>No credit card</span><span aria-hidden>•</span>
              <span>Setup support included</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================ FOOTER ================================ */

function Footer() {
  const link = "block text-sm text-brand-muted transition hover:text-brand-primary";
  return (
    <footer className="border-t border-brand-border bg-brand-surface">
      <Container>
        <div className="grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo small />
            <p className="mt-5 max-w-sm text-sm leading-7 text-brand-muted">
              An intelligent reception platform helping clinics automate appointments, queues and patient communication.
            </p>
          </div>
          {Object.entries(footerCols).map(([title, items]) => (
            <div key={title}>
              <p className="text-sm font-bold text-brand-text-h">{title}</p>
              <div className="mt-4 space-y-3">
                {items.map((item) => <a key={item} href="#" className={link}>{item}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-brand-border py-6 sm:flex-row sm:items-center">
          <p className="text-xs text-brand-muted">© {new Date().getFullYear()} AI Receptionist. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            {["Terms", "Privacy", "Security"].map((t) => (
              <a key={t} href="#" className="text-brand-muted hover:text-brand-primary">{t}</a>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}

/* ================================= APP ================================= */

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden bg-brand-bg text-brand-text">
        <Navbar />
        <main>
          <Hero />
          <TrustStrip />
          <ProblemSection />
          <FeaturesSection />
          <HowItWorks />
          <DashboardSection />
          <AIReceptionistSection />
          <ClinicSection />
          <BeforeAfter />
          <PricingSection />
          <Testimonials />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}