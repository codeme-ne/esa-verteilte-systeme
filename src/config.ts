import { ConfigProps } from "./types/config";

// DaisyUI v5 no longer exports themes directly, using fallback color
const themes = {
  light: {
    primary: "#3b82f6", // blue-500
  },
};

const config = {
  // REQUIRED
  appName: "Die Produktivitäts-Werkstatt",
  // REQUIRED: a short description of your app for SEO tags (can be overwritten)
  appDescription:
    "Lerne KI-Tools in 7 kompakten Lektionen – von Prompting bis Deployment. Praxisnah, schnell, direkt umsetzbar.",
  // REQUIRED (no https://, not trailing slash at the end, just the naked domain)
  domainName: "die-produktivitaets-werkstatt.vercel.app",
  crisp: {
    // Crisp website ID. IF YOU DON'T USE CRISP: just remove this => Then add a support email in this config file (resend.supportEmail) otherwise customer support won't work.
    id: "",
    // Hide Crisp by default, except on route "/". Crisp is toggled with <ButtonSupport/>. If you want to show Crisp on every routes, just remove this below
    onlyShowOnRoutes: ["/"],
  },
  resend: {
    // REQUIRED — Email 'From' field to be used when sending magic login links
    fromNoReply: `KI Kompakt Kurs <noreply@zangerlcoachingdynamics.com>`,
    // REQUIRED — Email 'From' field to be used when sending other emails, like abandoned carts, updates etc..
    fromAdmin: `Lukas <lukas@zangerlcoachingdynamics.com>`,
    // Email shown to customer if they need support. Leave empty if not needed => if empty, set up Crisp above, otherwise you won't be able to offer customer support."
    supportEmail: "lukas@zangerlcoachingdynamics.com",
  },
  colors: {
    // REQUIRED — The DaisyUI theme to use (added to the main layout.js). Leave blank for default (light & dark mode). If you use any theme other than light/dark, you need to add it in config.tailwind.js in daisyui.themes.
    theme: "light",
    // REQUIRED — This color will be reflected on the whole app outside of the document (loading bar, Chrome tabs, etc..). By default it takes the primary color from your DaisyUI theme (make sure to update your the theme name after "data-theme=")
    // OR you can just do this to use a custom color: main: "#f37055". HEX only.
    main: themes["light"]["primary"],
  },
  // Admin emails for video management and other admin features
  adminEmails: [
    "lukas@zangerlcoachingdynamics.com",
    "dev@local.test", // Dev cookie for testing
    "zangerl.luk@gmail.com",
  ],
} as ConfigProps;

export default config;
