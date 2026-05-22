import React, { useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { addContactEnquiry } from '../lib/memberService';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.message.trim()) e.message = 'Message is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await addContactEnquiry(form);
      setSuccess(true);
      setForm({ name: '', email: '', message: '' });
    } catch {
      setErrors({ submit: 'Failed to send message. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <h1 className="font-display text-headline-lg uppercase mb-4">CONTACT US</h1>
        <div className="w-24 h-1 bg-primary-container mb-16" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-section-gap">
          <div className="space-y-8">
            {[
              { icon: 'location_on', title: 'ADDRESS', body: '114C Negombo Rd, Wattala 32350, Sri Lanka' },
              { icon: 'call', title: 'PHONE', body: '070 322 2211' },
              { icon: 'schedule', title: 'OPENING HOURS', body: 'Mon–Fri: 5AM–10PM\nSat: 7AM–11AM\nSun: 5AM–10PM' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary-container text-3xl">{item.icon}</span>
                <div>
                  <h4 className="font-display text-headline-md uppercase mb-1">{item.title}</h4>
                  <p className="text-body-md text-on-surface-variant font-body whitespace-pre-line">{item.body}</p>
                </div>
              </div>
            ))}

            <div className="h-[300px] border-2 border-primary-container overflow-hidden mt-8">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3959.012345!2d79.8898!3d7.0062!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s114C+Negombo+Rd%2C+Wattala!5e0!3m2!1sen!2slk!4v1"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="IronHide Location"
              />
            </div>
          </div>

          <div>
            <h2 className="font-display text-headline-md uppercase mb-8">SEND A MESSAGE</h2>
            {success ? (
              <div className="border border-green-500 text-green-400 p-6 font-body text-body-md">
                Your message has been sent. We will get back to you shortly.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} error={errors.name} placeholder="Enter your full name" />
                <Input label="Email Address" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} error={errors.email} placeholder="Enter your email" />
                <Textarea label="Message" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} error={errors.message} placeholder="How can we help you?" rows={6} />
                {errors.submit && <p className="text-error text-body-md font-body">{errors.submit}</p>}
                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">SEND MESSAGE</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
