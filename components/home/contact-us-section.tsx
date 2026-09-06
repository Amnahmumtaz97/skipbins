import { Mail, Phone, Clock, MapPin } from "lucide-react";

type ContactInfo = {
  email: string;
  phone: string;
  hours: string;
  address: string;
};

export function ContactUsSection({ contact }: { contact: ContactInfo }) {
  return (
    <section id="contact-us" className="mx-auto w-full max-w-[1400px] space-y-10 px-5 py-20 sm:px-8 lg:py-28">
      <div className="text-center">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#65A30D]">Get in touch</p>
        <h2 className="text-4xl font-black leading-tight tracking-[-0.05em] text-[#0B3B24] sm:text-5xl">
          Contact Us
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[#405347]">
          Have a question? Our friendly team is here to help. Reach out anytime.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Email */}
        <div className="rounded-2xl border border-[#e4e8dc] bg-white p-6 text-center transition hover:border-[#65A30D] hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#DDECCB]">
            <Mail size={24} className="text-[#65A30D]" />
          </div>
          <h3 className="font-bold text-[#0B3B24]">Email</h3>
          <a
            href={`mailto:${contact.email}`}
            className="mt-2 text-sm text-[#405347] transition hover:text-[#65A30D]"
          >
            {contact.email}
          </a>
        </div>

        {/* Phone */}
        <div className="rounded-2xl border border-[#e4e8dc] bg-white p-6 text-center transition hover:border-[#65A30D] hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#DDECCB]">
            <Phone size={24} className="text-[#65A30D]" />
          </div>
          <h3 className="font-bold text-[#0B3B24]">Phone</h3>
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            className="mt-2 text-sm text-[#405347] transition hover:text-[#65A30D]"
          >
            {contact.phone}
          </a>
        </div>

        {/* Hours */}
        <div className="rounded-2xl border border-[#e4e8dc] bg-white p-6 text-center transition hover:border-[#65A30D] hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#DDECCB]">
            <Clock size={24} className="text-[#65A30D]" />
          </div>
          <h3 className="font-bold text-[#0B3B24]">Hours</h3>
          <p className="mt-2 text-xs text-[#405347]">{contact.hours}</p>
        </div>

        {/* Address */}
        <div className="rounded-2xl border border-[#e4e8dc] bg-white p-6 text-center transition hover:border-[#65A30D] hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#DDECCB]">
            <MapPin size={24} className="text-[#65A30D]" />
          </div>
          <h3 className="font-bold text-[#0B3B24]">Address</h3>
          <p className="mt-2 text-xs text-[#405347]">{contact.address}</p>
        </div>
      </div>

      {/* Contact Form */}
      <div className="grid gap-8 lg:grid-cols-2">
        <form className="rounded-2xl border border-[#e4e8dc] bg-white p-6 sm:p-8">
          <h3 className="text-xl font-bold text-[#0B3B24]">Send us a message</h3>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-[#0B3B24]">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                className="mt-2 w-full rounded-lg border border-[#cbd8c5] bg-[#FAF9F3] px-4 py-3 text-sm text-[#172018] outline-none transition focus:border-[#0B3B24] focus:ring-2 focus:ring-[#DDECCB]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#0B3B24]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="mt-2 w-full rounded-lg border border-[#cbd8c5] bg-[#FAF9F3] px-4 py-3 text-sm text-[#172018] outline-none transition focus:border-[#0B3B24] focus:ring-2 focus:ring-[#DDECCB]"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-[#0B3B24]">
                Message
              </label>
              <textarea
                id="message"
                placeholder="How can we help?"
                rows={4}
                className="mt-2 w-full rounded-lg border border-[#cbd8c5] bg-[#FAF9F3] px-4 py-3 text-sm text-[#172018] outline-none transition focus:border-[#0B3B24] focus:ring-2 focus:ring-[#DDECCB]"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#0B3B24] py-3 font-bold text-white transition hover:bg-[#14532D]"
            >
              Send Message
            </button>
          </div>
        </form>

        {/* Contact Info Box */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#F4F7EC] p-6 sm:p-8">
            <h3 className="text-lg font-bold text-[#0B3B24]">Why choose SkipBins?</h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3 text-sm text-[#405347]">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#65A30D]" />
                Local, family-owned business serving the community
              </li>
              <li className="flex items-start gap-3 text-sm text-[#405347]">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#65A30D]" />
                90% of waste diverted from landfill through recycling
              </li>
              <li className="flex items-start gap-3 text-sm text-[#405347]">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#65A30D]" />
                Fast, reliable delivery and pickup service
              </li>
              <li className="flex items-start gap-3 text-sm text-[#405347]">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#65A30D]" />
                Transparent pricing with no hidden fees
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#0B3B24] to-[#14532D] p-6 text-white sm:p-8">
            <h3 className="text-lg font-bold">Emergency Pickup?</h3>
            <p className="mt-2 text-sm text-[#DDECCB]/80">
              Need urgent bin collection? Call us directly and we&apos;ll arrange same-day service if available.
            </p>
            <button className="mt-4 rounded-lg bg-[#65A30D] px-4 py-2 text-sm font-bold text-[#0B3B24] transition hover:bg-[#7bc325]">
              Call Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
