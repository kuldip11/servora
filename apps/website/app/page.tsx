import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, ChefHat, ShoppingBag } from "lucide-react";
import { InteractiveProductDemosLazy } from "@/components/marketing/InteractiveProductDemosLazy";

export const metadata: Metadata = {
  title: "Servora — Every order. Every team. One flow.",
  description:
    "Connect guest ordering, front of house, kitchen execution, billing and business control with Servora's restaurant operating platform.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Servora — Every order. Every team. One flow.",
    description:
      "A connected restaurant operating platform for guests, waiters, kitchens and growing restaurant businesses.",
    url: "/",
    images: [
      {
        url: "/og?title=home",
        width: 1200,
        height: 630,
        alt: "Servora restaurant operating platform",
      },
    ],
  },
};

const workflow = [
  ["Guest orders", "QR or staff-assisted"],
  ["Waiter confirms", "Table context intact"],
  ["Kitchen prepares", "Live ticket queue"],
  ["Bill settles", "One order record"],
  ["Owner learns", "Branch-level insight"],
] as const;

const outcomes = [
  [
    "01",
    "Faster table service",
    "Guests and staff can order without losing table or customer context.",
  ],
  [
    "02",
    "A calmer kitchen",
    "Tickets arrive clearly and progress stays visible to front of house.",
  ],
  [
    "03",
    "Better guest confidence",
    "Customers can follow their order and request help without guessing.",
  ],
  [
    "04",
    "Control as you grow",
    "Business, franchise and branch structure stays understandable.",
  ],
] as const;

const platformGroups = [
  {
    icon: ShoppingBag,
    eyebrow: "Front of house",
    title: "Serve every order channel",
    description:
      "Waiter ordering, customer QR, tables, customer context, cart customization, POS and order operations.",
    href: "/product/pos-and-orders",
  },
  {
    icon: ChefHat,
    eyebrow: "Kitchen",
    title: "Keep the kitchen moving",
    description:
      "Live tickets, kitchen stages, item details, readiness signals and synchronized order progress.",
    href: "/product/kitchen-display",
  },
  {
    icon: BarChart3,
    eyebrow: "Business operations",
    title: "Run the business with context",
    description:
      "Menu, inventory, staff, roles, billing, analytics and multi-branch business hierarchy.",
    href: "/product",
  },
] as const;

const HeroProductPreview = () => (
  <div className="relative mx-auto min-h-[410px] w-full max-w-[650px] lg:min-h-[500px]">
    <div className="absolute right-0 top-3 w-[92%] rotate-[1.3deg] overflow-hidden rounded-[26px] border-[8px] border-[#172019] bg-[#f8faf8] text-[#172019] shadow-[0_35px_70px_rgba(24,50,36,0.18)]">
      <div className="flex items-center justify-between border-b border-[#dfe6e1] px-4 py-3 text-[9px] font-bold sm:text-[11px]">
        <span>servora · Olive & Ember</span>
        <span className="text-[#738078]">All branches · Live</span>
      </div>
      <div className="grid h-[300px] grid-cols-[84px_1fr] sm:h-[370px] sm:grid-cols-[120px_1fr]">
        <aside className="border-r border-[#dfe6e1] bg-[#f1f5f2] p-2 sm:p-3">
          {["Overview", "Orders", "Menu", "Kitchen", "Inventory", "Team"].map(
            (item, index) => (
              <div
                key={item}
                className={`mb-1 rounded-lg px-2 py-2 text-[8px] font-semibold sm:text-[9px] ${index === 0 ? "bg-[#dfeee4] text-[#174e36]" : "text-[#738078]"}`}
              >
                {item}
              </div>
            ),
          )}
        </aside>
        <main className="min-w-0 p-3 sm:p-5">
          <div className="flex items-end justify-between">
            <h3 className="text-sm font-bold sm:text-base">
              Today at a glance
            </h3>
            <span className="text-[7px] text-[#738078] sm:text-[8px]">
              Connaught Place
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Open orders", "18"],
              ["Ready now", "06"],
              ["Net sales", "₹42.8k"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[#e0e5e1] bg-white p-2 sm:p-3"
              >
                <span className="block text-[6px] text-[#738078] sm:text-[8px]">
                  {label}
                </span>
                <strong className="mt-1 block text-xs sm:text-lg">
                  {value}
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-[#e0e5e1] bg-white p-3">
            <div className="flex justify-between text-[8px] font-bold sm:text-[10px]">
              <span>Order activity</span>
              <span>Lunch → Dinner</span>
            </div>
            <div className="mt-4 flex h-24 items-end gap-1.5 sm:h-36 sm:gap-2">
              {[35, 52, 42, 74, 60, 88, 70, 95, 78, 64].map((height, index) => (
                <span
                  key={index}
                  style={{ height: `${height}%` }}
                  className={`flex-1 rounded-t ${index % 3 === 0 ? "bg-[#e96f35]" : "bg-[#b9d9c4]"}`}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 z-10 h-[275px] w-[142px] -rotate-[4deg] overflow-hidden rounded-[28px] border-[6px] border-[#151b17] bg-[#f6f2e8] text-[#172019] shadow-[0_24px_50px_rgba(23,32,25,0.28)] sm:h-[330px] sm:w-[175px]">
      <header className="bg-[#174e36] px-3 pb-3 pt-7 text-white">
        <span className="text-[6px] opacity-70">WELCOME TO</span>
        <strong className="block font-serif text-sm sm:text-base">
          Olive & Ember
        </strong>
        <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[6px] text-[#758078]">
          Search dishes or drinks
        </div>
      </header>
      <div className="flex gap-1 overflow-hidden px-2 py-2">
        {["For you", "Starters", "Mains"].map((item, index) => (
          <span
            key={item}
            className={`shrink-0 rounded-full px-2 py-1 text-[5px] font-bold ${index === 0 ? "bg-[#174e36] text-white" : "bg-white"}`}
          >
            {item}
          </span>
        ))}
      </div>
      <div className="px-2">
        {[
          ["Smoky paneer bowl", "₹420", "from-[#edca7e] to-[#c66f31]"],
          ["Garden mezze", "₹380", "from-[#dce6bd] to-[#789756]"],
        ].map(([name, price, gradient]) => (
          <div
            key={name}
            className="mt-1 grid grid-cols-[42px_1fr_15px] items-center gap-1.5 rounded-lg bg-white p-1.5"
          >
            <span className={`h-10 rounded-md bg-gradient-to-br ${gradient}`} />
            <span>
              <strong className="block text-[6px] leading-tight">{name}</strong>
              <span className="text-[5px] text-[#758078]">{price}</span>
            </span>
            <span className="grid size-4 place-items-center rounded-full bg-[#174e36] text-[8px] text-white">
              +
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#f6f2e8] text-[#142219]">
        <div className="pointer-events-none absolute -right-48 -top-64 size-[620px] rounded-full bg-[radial-gradient(circle,rgba(200,235,134,0.35),transparent_68%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-28">
          <div>
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#23724d] before:h-0.5 before:w-6 before:bg-[#e96f35]">
              Restaurant operations, in sync
            </p>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Every order. Every team.{" "}
              <span className="text-[#23724d]">One flow.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#657068] sm:text-lg">
              Servora connects guest ordering, front of house, kitchen
              execution, billing and business control—so your restaurant runs as
              one operation instead of separate tools.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/book-a-demo"
                className="rounded-xl bg-[#174e36] px-5 py-3.5 text-center text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,78,54,0.25)] hover:bg-[#236c4a]"
              >
                Request a Demo
              </Link>
              <Link
                href="#interactive-demos"
                className="rounded-xl border border-[#dcd8cd] bg-[#fffdf8] px-5 py-3.5 text-center text-sm font-bold text-[#142219] hover:bg-white"
              >
                Explore the product below
              </Link>
            </div>
            <p className="mt-4 text-xs text-[#778078]">
              Built for independent restaurants, groups and multi-branch
              operators.
            </p>
          </div>
          <HeroProductPreview />
        </div>
      </section>

      <section className="border-y border-[#dcd8cd] bg-[#fffdf8] text-[#142219]">
        <div className="mx-auto grid max-w-7xl gap-3 px-6 py-6 sm:grid-cols-5 lg:px-8">
          {workflow.map(([title, subtitle], index) => (
            <div key={title} className="relative text-center sm:px-2">
              <strong className="block text-sm">{title}</strong>
              <span className="mt-1 block text-xs text-[#657068]">
                {subtitle}
              </span>
              {index < workflow.length - 1 && (
                <span className="absolute -right-2 top-2 hidden text-[#e96f35] sm:block">
                  +
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
      <InteractiveProductDemosLazy />

      <section className="bg-[#174e36] py-20 text-white sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c8eb86]">
              Built for a busy service
            </p>
            <h2 className="mt-3 font-serif text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
              Show what changes during a busy service.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[#d3e2d8] sm:text-base">
              Servora connects each operational handoff, so orders carry the
              right context from the guest or waiter to the kitchen, bill and
              business record.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {outcomes.map(([number, title, description]) => (
              <article
                key={number}
                className="rounded-2xl border border-white/15 bg-white/[0.04] p-6"
              >
                <span className="font-serif text-2xl font-bold text-[#c8eb86]">
                  {number}
                </span>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#cadbd0]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f2e8] py-20 text-[#142219] sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-end gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#23724d]">
                Complete platform
              </p>
              <h2 className="mt-3 font-serif text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
                Organized around real restaurant work.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#657068] sm:text-base">
              Explore the detailed product pages for menu, ordering, kitchen,
              billing, inventory, teams, analytics, security and multi-branch
              operations.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {platformGroups.map(
              ({ icon: Icon, eyebrow, title, description, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="group rounded-2xl border border-[#dcd8cd] bg-[#fffdf8] p-7 transition hover:-translate-y-1 hover:border-[#9fbaa8] hover:shadow-lg"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-[#e1eee5] text-[#174e36]">
                    <Icon size={21} />
                  </span>
                  <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.15em] text-[#e96f35]">
                    {eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#657068]">
                    {description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#23724d]">
                    Explore capabilities{" "}
                    <ArrowRight
                      size={16}
                      className="transition group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f2e8] px-6 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#173d2c] to-[#0e271c] px-7 py-14 text-center text-white sm:px-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c8eb86]">
            See your workflow connected
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
            See your restaurant running as one connected system.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#cadbd0] sm:text-base">
            Walk through a demo tailored to your service model, teams and branch
            structure.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/book-a-demo"
              className="rounded-xl bg-[#c8eb86] px-5 py-3.5 text-sm font-bold text-[#15341f]"
            >
              Request a Demo
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/20 px-5 py-3.5 text-sm font-bold text-white"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
