# THIRD-PARTY OPEN SOURCE NOTICES & LICENSES

NIDHISETU incorporates, adapts, and builds upon components from the following open-source repositories and libraries:

---

## 1. Primary Application Foundation: KoshSetu
- **Origin Repository:** `https://github.com/nishikadhankhar/koshsetu-sih`
- **Authors/Maintainers:** Nishika Dhankhar & contributors
- **License:** MIT License
- **Usage & Modifications in NIDHISETU:**
  - Used as the core full-stack architectural baseline (FastAPI backend + React Vite frontend).
  - Rebranded from KoshSetu to **NIDHISETU** with custom institutional fintech design tokens (`#10233F` deep navy, `#2855D9` royal blue, `#0D9488` teal accent, `#F7F8FC` canvas).
  - Modernized configuration schema to support `NIDHISETU_` environment prefix with backward-compatible fallbacks.
  - Enhanced the evidence comparison model with explainable discrepancy rationales and explicit reviewer recommendations.
  - Added new Smart Action Queue endpoint and responsive priority-ranked UI.

---

## 2. Security & Forensics Reference: FDR-Sentinel
- **Origin Repository:** `https://github.com/coderkartik7/SIH26265_FDR-Sentinel`
- **Authors/Maintainers:** Kartik & contributors
- **License:** MIT License
- **Usage & Modifications in NIDHISETU:**
  - Inspected cryptographic document encryption, hash chain mechanisms, and digital signature validators.
  - Implemented authenticated **AES-256-GCM** encryption/decryption with randomized 12-byte nonces for sensitive deposit data and records.
  - Integrated **Ed25519** asymmetric key pair generation, canonical payload signing, and tamper-resistant QR envelope verification (`app/domains/documents/forensics.py`).
  - Integrated **pyHanko** CMS digital signature inspection and root CA verification against synthetic trust certificates.
  - Added multi-vector **Duplicate Radar** comparing exact binary SHA-256 document checksums and normalized bank reference lookup hashes.
  - Implemented dynamic audit ledger tampering simulation to demonstrate real-time hash-chain divergence detection.

---

## 3. Python & JavaScript Ecosystem Libraries
- **FastAPI / Starlette / Uvicorn:** MIT License
- **SQLAlchemy:** MIT License
- **PyJWT:** MIT License
- **Cryptography (pyca/cryptography):** Apache 2.0 / BSD License
- **pyHanko & pyhanko-certvalidator:** MIT License
- **QRCode & Pillow:** BSD License / HPND License
- **OpenCV (opencv-python-headless):** Apache 2.0 License
- **React, React Router, TanStack Query:** MIT License
- **Lucide Icons:** ISC License
- **Tailwind CSS:** MIT License
- **Recharts:** MIT License
