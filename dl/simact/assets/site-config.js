/* ═══════════════════════════════════════════════════════════════════════════
   THE ONLY FILE YOU EDIT.

   Same idea as the Foundation site: nothing on the page contains a figure, an
   address or an e-mail. They all come from here, so a detail that is not
   confirmed yet is simply left empty and its row is not printed at all.

   ⛔ An empty value is never rendered as a blank box. A blank box on an
   investor-facing page invites the reader to fill it in with a guess.
   ═══════════════════════════════════════════════════════════════════════════ */

window.SITE_CONFIG = {

  ORG_NAME:  "SImACT",
  ORG_LEGAL: "Société Immobilière d’Agriculture, de Commerce et de Tourisme",
  /* ⚠️ The supplied logo artwork reads "Socially Concious Investors" -
     Conscious is misspelled in the image itself. The word is spelled correctly
     everywhere on this site; the logo is shown exactly as supplied and is NOT
     retouched, because it is their mark to correct, not mine. Flagged to
     Jeffery 21 Sep. */
  ORG_LOGO:  "assets/simact-logo.jpg",
  ORG_DOMAIN: "simact.net",

  /* ─────────────────────────────────────────────────────────────────────────
     WHERE ENQUIRIES GO
     The Investors form and the Contact form both post here. Leave empty and
     each form says plainly that it is not connected yet and offers the e-mail
     instead - it never pretends a message was sent.
     ───────────────────────────────────────────────────────────────────────── */
  FORM_ENDPOINT: "",

  /* Not published until confirmed to exist and to be monitored. An address on
     a contact page that nobody reads is worse than no address at all. */
  CONTACT_EMAIL:   "",
  CONTACT_PHONE_US: "",
  CONTACT_PHONE_HT: "",
  CONTACT_ADDRESS_US: "",
  CONTACT_ADDRESS_HT: "",

  /* A booking link (Calendly or similar) turns on the "Request an appointment"
     option. The content document asks for a calendar; until there is a real
     link, the option is left out rather than shown dead. */
  APPOINTMENT_URL: "",

  SOCIAL: { linkedin: "", facebook: "", instagram: "" },

  /* ─────────────────────────────────────────────────────────────────────────
     THE NUMBERS — every one quoted from SImACT's own content document.
     ⛔ Do not invent one, and do not round one up.
     ───────────────────────────────────────────────────────────────────────── */
  STATS: [
    { value: "2004",  label: "Founded" },
    { value: "20+",   label: "Years of operation" },
    { value: "31+",   label: "Shareholders" },
    { value: "2",     label: "Countries of incorporation" }
  ],

  /* ⛔ DELIBERATELY EMPTY — the Cap Lamandou valuation.
     Their document reads: "the property's replacement value was estimated at
     more than $4 million, while the business value of the hotel was estimated
     at more than $5 million. d through a current independent valuation before
     be" — the qualifying sentence is CUT OFF MID-WORD in the source.
     Publishing the figures without the caveat their own author was in the
     middle of writing would put an unqualified valuation in front of
     investors. Fill these in only from a complete, confirmed sentence. */
  CAP_LAMANDOU_REPLACEMENT_VALUE: "",
  CAP_LAMANDOU_BUSINESS_VALUE: "",
  CAP_LAMANDOU_VALUATION_CAVEAT: "",

  THEME: {
    navy:     "#0A1F44",
    navyDeep: "#061530",
    red:      "#CE1126",
    sea:      "#1B7FA8",
    sand:     "#F6F3ED",
    ink:      "#16233F",
    muted:    "#5C6B85"
  }
};
