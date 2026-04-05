# EntropyX-ID - Product Requirements Document

## Original Problem Statement
Build a full-stack production-style web application called "EntropyX-ID — Secure Digital Identity & Device Binding Platform" that solves cybersecurity challenges of session hijacking, replay attacks, and device spoofing by binding user identity to live device entropy signals and storing trust proofs on blockchain.

## User Personas
1. **Security Engineers** - Evaluating enterprise zero-trust identity solutions
2. **Hackathon Judges** - Looking for innovative security demonstrations
3. **DevSecOps Teams** - Implementing device-bound authentication
4. **Enterprise Security Architects** - Assessing identity verification platforms

## Core Requirements (Static)
- Device-bound authentication using entropy signals
- Real-time entropy collection (camera, network, timestamp, timing)
- Simulated blockchain trust ledger
- Trust score calculation and evolution
- Spoof detection and prevention
- Immutable audit trail

## Architecture

### Tech Stack
- **Frontend**: React 19, Tailwind CSS, Phosphor Icons, Framer Motion
- **Backend**: FastAPI, SQLite with WAL mode, SQLAlchemy
- **Auth**: JWT-based authentication with bcrypt password hashing

### Database Schema
1. **users** - user_id, email, password_hash, trust_score, created_at
2. **trusted_devices** - device_id, user_id, fingerprint_hash, entropy_signature, trust_level, blockchain_proof_hash
3. **login_sessions** - session_id, user_id, device_id, entropy_nonce, login_status
4. **blockchain_trust_logs** - proof_id, device_hash, session_hash, verification_status, block_number, nonce

### API Endpoints
- POST /api/login - Authenticate with entropy verification
- POST /api/register - Create new user account
- GET /api/auth/me - Get current user
- POST /api/logout - Terminate session
- POST /api/device/verify - Verify device trust
- GET /api/device/trusted - List trusted devices
- GET /api/entropy/status - Get live entropy status
- GET /api/session/history - Get login session history
- GET /api/trust-ledger - Get blockchain trust ledger
- POST /api/device/simulate - Simulate trusted/spoofed device
- POST /api/spoof-check - Check for spoof indicators
- POST /api/simulation/full-demo - Run complete demo flow

## What's Been Implemented (April 3, 2026)

### Phase 1 - Core MVP ✅
- [x] Login page with security status display
- [x] JWT authentication with bcrypt
- [x] Trust Dashboard with real-time metrics
- [x] Blockchain Trust Ledger with terminal-style UI
- [x] Entropy Engine with live waveform visualization
- [x] Device Simulator with trusted/spoofed comparison
- [x] Full demo simulation for hackathon judges
- [x] Pre-seeded demo data
- [x] Futuristic cybersecurity dark UI (Unbounded font, neon green accents)

### Security Features Demonstrated
- Replay attack prevention (one-time entropy nonces)
- Device spoof detection (hardware entropy analysis)
- Session hijack resistance (device-bound proofs)
- Trust score evolution
- Blockchain auditability
- Immutable trust history

## Prioritized Backlog

### P0 - Critical (Next Session)
- None - MVP complete

### P1 - High Priority
- Real webcam entropy integration with permission handling
- Multi-factor authentication support
- Session timeout and re-authentication flow
- Export trust reports as PDF

### P2 - Medium Priority
- Real blockchain integration (Ethereum testnet)
- Device management (revoke trusted devices)
- Email notifications for suspicious activity
- Dark/light theme toggle
- Mobile-responsive optimization

### P3 - Nice to Have
- Biometric entropy integration
- Geographic anomaly detection
- Team/organization management
- API rate limiting dashboard
- Audit log export functionality

## Test Credentials
- Admin: admin@entropyx.io / admin123
- Demo: demo@entropyx.io / demo123

## Next Tasks
1. Implement real webcam entropy with fallback
2. Add session timeout handling
3. Create trust report export feature
4. Add device revocation functionality
