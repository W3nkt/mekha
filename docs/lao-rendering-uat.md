# Lao rendering verification (S4-04)

The app bundles Noto Sans Lao locally, preloads it in the document head, uses `font-display: swap`, and applies `line-height: 2` globally to keep tone marks and stacked vowels visible.

Run this checklist on a physical Android 9/10 device and Android 14 (or an emulator when hardware is unavailable). Capture screenshots and add the device/browser details to `docs/SESSION-LOG.md`.

Test strings:

```text
ສະ ຫວັດດີ ທ່ານ
ຂາຍດີ ເປັນ ລະ ບົບ ຂອງ ຜູ້ຂາຍ
ກຸ່ມ ສິນຄ້າ ມີ 120 ລາຍ ການ
ລາຄາ: ₭ 250,000
ນ້ໍາ ໜຶ່ງ ຂວດ ລາຄາ 5,000 ກີບ
ໄປ ຮ້ານ ເດີ ຈ່ອ ໄດ້ ບໍ?
```

- [ ] No FOUT or fallback squares during cold load.
- [ ] Tone marks ່ ້ ໊ ໋ and stacked vowels ຸ ູ are not clipped.
- [ ] Lao wraps in order notes, product names, tables, and seller profiles.
- [ ] Lao keyboard composition remains stable in every input.
- [ ] Lao mixed with Latin, numerals, and ₭ has a consistent baseline.
- [ ] Courier label/PDF output uses the embedded Lao font.

Physical-device sign-off: `__________________` on `____________` (Android `_____`, browser `_____`).
