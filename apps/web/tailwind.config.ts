export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 500: "#3b82f6", 900: "#1a3a5c" },
        success: "#0e4429",
        warning: "#92400e",
        danger: "#991b1b",
      },
      fontFamily: {
        sans: [
          '"Noto Sans Lao Variable"',
          '"Noto Sans Lao"',
          "Inter",
          "sans-serif",
        ],
      },
      lineHeight: { lao: "2", "lao-heading": "1.6" },
      fontSize: {
        caption: "0.75rem",
        "body-sm": "0.875rem",
        body: "1rem",
        "body-lg": "1.125rem",
      },
    },
  },
};
