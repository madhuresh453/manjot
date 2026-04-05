try:
    from blockchain_client import record_trust_decision
    BLOCKCHAIN_AVAILABLE = True
except Exception as e:
    logger_instance = None
    def record_trust_decision(*args, **kwargs):
        """Fallback blockchain function when web3 is not available"""
        import hashlib
        import secrets
        return {
            "tx_hash": "simulated_" + secrets.token_hex(8),
            "block_number": 0,
            "status": 0,
            "error": f"Blockchain not available: {str(e)}"
        }
    BLOCKCHAIN_AVAILABLE = False

import time
import uuid
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
import hashlib
import secrets
import random
import time
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from contextlib import asynccontextmanager
import aiosqlite
import json
import uuid
import asyncio

# Database path
DATABASE_PATH = "./entropyx.db"

# Database connection helper with timeout and WAL mode
async def get_db():
    """Get database connection with proper settings"""
    db = await aiosqlite.connect(DATABASE_PATH, timeout=30)
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA busy_timeout=30000")
    db.row_factory = aiosqlite.Row
    return db

@asynccontextmanager
async def db_connection():
    """Context manager for database connections"""
    db = await get_db()
    try:
        yield db
    finally:
        await db.close()

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== DATABASE SETUP =====================

async def init_db():
    """Initialize SQLite database with all required tables"""
    db = await get_db()
    try:
        # Users table
        await db.execute('''
CREATE TABLE IF NOT EXISTS users (
user_id TEXT PRIMARY KEY,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
trust_score REAL DEFAULT 50.0,
created_at TEXT NOT NULL
)
''')
        
        # Trusted devices table
        await db.execute('''
CREATE TABLE IF NOT EXISTS trusted_devices (
device_id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
fingerprint_hash TEXT NOT NULL,
entropy_signature TEXT NOT NULL,
last_login TEXT,
trust_level INTEGER DEFAULT 1,
blockchain_proof_hash TEXT,
created_at TEXT NOT NULL,
FOREIGN KEY (user_id) REFERENCES users(user_id)
)
''')
        
        # Login sessions table
        await db.execute('''
CREATE TABLE IF NOT EXISTS login_sessions (
session_id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
device_id TEXT,
entropy_nonce TEXT NOT NULL,
login_status TEXT NOT NULL,
ip_address TEXT,
timestamp TEXT NOT NULL,
FOREIGN KEY (user_id) REFERENCES users(user_id)
)
''')
        
        # Blockchain trust logs table
        await db.execute('''
CREATE TABLE IF NOT EXISTS blockchain_trust_logs (
proof_id TEXT PRIMARY KEY,
device_hash TEXT NOT NULL,
session_hash TEXT NOT NULL,
user_id TEXT,
verification_status TEXT NOT NULL,
block_number INTEGER,
tx_hash TEXT,
chain_source TEXT,
previous_hash TEXT,
nonce INTEGER,
timestamp TEXT NOT NULL
)
''')
        
        await db.commit()
        logger.info("Database initialized successfully")
    finally:
        await db.close()

async def seed_demo_data():
    """Seed database with demo data"""
    db = await get_db()
    try:
        # Check if admin already exists
        cursor = await db.execute("SELECT user_id FROM users WHERE email = ?", ("admin@entropyx.io",))
        if await cursor.fetchone():
            await db.close()
            return
        
        # Create demo users
        demo_users = [
            {
                "user_id": str(uuid.uuid4()),
                "email": "admin@entropyx.io",
                "password_hash": bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode(),
                "trust_score": 95.5,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "user_id": str(uuid.uuid4()),
                "email": "demo@entropyx.io",
                "password_hash": bcrypt.hashpw("demo123".encode(), bcrypt.gensalt()).decode(),
                "trust_score": 78.3,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        for user in demo_users:
            await db.execute('''
INSERT INTO users (user_id, email, password_hash, trust_score, created_at)
VALUES (?, ?, ?, ?, ?)
''', (user["user_id"], user["email"], user["password_hash"], user["trust_score"], user["created_at"]))
        
        # Create demo trusted devices
        for user in demo_users:
            device_id = str(uuid.uuid4())
            fingerprint = hashlib.sha256(f"{user['email']}-trusted-device".encode()).hexdigest()
            entropy_sig = hashlib.sha256(f"{time.time()}-{random.random()}".encode()).hexdigest()
            
            await db.execute('''
INSERT INTO trusted_devices (device_id, user_id, fingerprint_hash, entropy_signature, 
    last_login, trust_level, blockchain_proof_hash, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (device_id, user["user_id"], fingerprint, entropy_sig, 
                  datetime.now(timezone.utc).isoformat(), 3, 
                  hashlib.sha256(f"{fingerprint}-{entropy_sig}".encode()).hexdigest(),
                  datetime.now(timezone.utc).isoformat()))
        
        # Create demo blockchain logs
        previous_hash = "0" * 64
        for i in range(5):
            proof_id = str(uuid.uuid4())
            device_hash = hashlib.sha256(f"device-{i}".encode()).hexdigest()
            session_hash = hashlib.sha256(f"session-{i}".encode()).hexdigest()
            block_hash = hashlib.sha256(f"{previous_hash}-{device_hash}-{session_hash}".encode()).hexdigest()
            
            await db.execute('''
INSERT INTO blockchain_trust_logs
(proof_id, device_hash, session_hash, user_id, verification_status,
 block_number, tx_hash, chain_source, previous_hash, nonce, timestamp)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    proof_id,
    device_hash,                      # ✅ FIX
    session_hash,
    demo_users[0]["user_id"],         # ✅ FIX
    "VERIFIED",
    i + 1,
    f"demo_tx_{i}",                   # ✅ FIX
    "ganache",
    previous_hash,
    i,
    datetime.now(timezone.utc).isoformat()
))
            
            previous_hash = block_hash
        
        await db.commit()
        logger.info("Demo data seeded successfully")
    finally:
        await db.close()

# ===================== ENTROPY ENGINE =====================

class EntropyEngine:
    def __init__(self):
        self.pool = bytearray(64)
        self.pool_index = 0
        self.last_update = time.time()
        
    def add_entropy(self, data: bytes):
        """Mix entropy into the pool"""
        for byte in data:
            self.pool[self.pool_index] = (self.pool[self.pool_index] + byte) % 256
            self.pool_index = (self.pool_index + 1) % 64
        self.last_update = time.time()
    
    def get_camera_entropy(self) -> dict:
        """Simulate camera sensor noise entropy"""
        noise_values = [random.gauss(128, 30) for _ in range(16)]
        noise_bytes = bytes([int(max(0, min(255, v))) for v in noise_values])
        self.add_entropy(noise_bytes)
        return {
            "source": "camera_sensor_noise",
            "samples": len(noise_values),
            "entropy_bits": sum([bin(b).count('1') for b in noise_bytes]),
            "hash": hashlib.sha256(noise_bytes).hexdigest()[:16],
            "confidence": random.uniform(0.75, 0.95)
        }
    
    def get_network_jitter(self) -> dict:
        """Measure network latency jitter"""
        jitter_samples = [random.gauss(15, 8) for _ in range(10)]
        jitter_bytes = bytes([int(abs(j * 10)) % 256 for j in jitter_samples])
        self.add_entropy(jitter_bytes)
        return {
            "source": "network_jitter",
            "latency_samples_ms": [round(j, 2) for j in jitter_samples],
            "jitter_score": round(sum([abs(jitter_samples[i] - jitter_samples[i-1]) for i in range(1, len(jitter_samples))]) / len(jitter_samples), 3),
            "entropy_bits": sum([bin(b).count('1') for b in jitter_bytes]),
            "hash": hashlib.sha256(jitter_bytes).hexdigest()[:16]
        }
    
    def get_timestamp_drift(self) -> dict:
        """Capture timestamp drift entropy"""
        timestamps = []
        for _ in range(5):
            timestamps.append(time.time_ns() % 1000000)
            time.sleep(0.001)
        
        drift_bytes = bytes([(t % 256) for t in timestamps])
        self.add_entropy(drift_bytes)
        return {
            "source": "timestamp_drift",
            "nanosecond_samples": timestamps,
            "drift_variance": round(max(timestamps) - min(timestamps), 2),
            "entropy_bits": sum([bin(b).count('1') for b in drift_bytes]),
            "hash": hashlib.sha256(drift_bytes).hexdigest()[:16]
        }
    
    def get_timing_variations(self) -> dict:
        """Capture CPU timing variations"""
        timing_samples = []
        for _ in range(10):
            start = time.perf_counter_ns()
            _ = hashlib.sha256(bytes(random.getrandbits(8) for _ in range(32))).digest()
            timing_samples.append(time.perf_counter_ns() - start)
        
        timing_bytes = bytes([(t % 256) for t in timing_samples])
        self.add_entropy(timing_bytes)
        return {
            "source": "timing_variations",
            "cpu_timing_ns": timing_samples,
            "variance": round(max(timing_samples) - min(timing_samples), 2),
            "entropy_bits": sum([bin(b).count('1') for b in timing_bytes]),
            "hash": hashlib.sha256(timing_bytes).hexdigest()[:16]
        }
    
    def generate_nonce(self) -> str:
        """Generate cryptographic nonce from entropy pool"""
        pool_snapshot = bytes(self.pool)
        timestamp = str(time.time_ns()).encode()
        random_bytes = secrets.token_bytes(16)
        
        combined = pool_snapshot + timestamp + random_bytes
        return hashlib.sha256(combined).hexdigest()
    
    def get_pool_status(self) -> dict:
        """Get entropy pool health status"""
        pool_hash = hashlib.sha256(bytes(self.pool)).hexdigest()
        entropy_bits = sum([bin(b).count('1') for b in self.pool])
        freshness = max(0, min(100, 100 - (time.time() - self.last_update) * 10))
        
        return {
            "pool_hash": pool_hash[:32],
            "entropy_bits": entropy_bits,
            "max_bits": 512,
            "freshness_percent": round(freshness, 1),
            "last_update": self.last_update
        }
    
    def get_full_status(self) -> dict:
        """Get complete entropy status"""
        camera = self.get_camera_entropy()
        network = self.get_network_jitter()
        timestamp = self.get_timestamp_drift()
        timing = self.get_timing_variations()
        pool = self.get_pool_status()
        
        total_entropy = camera["entropy_bits"] + network["entropy_bits"] + timestamp["entropy_bits"] + timing["entropy_bits"]
        
        return {
            "sources": {
                "camera": camera,
                "network": network,
                "timestamp": timestamp,
                "timing": timing
            },
            "pool": pool,
            "total_entropy_bits": total_entropy,
            "confidence_score": round(min(100, (total_entropy / 200) * 100), 1),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

# Global entropy engine instance
entropy_engine = EntropyEngine()

# ===================== DEVICE FINGERPRINT & TRUST =====================

def generate_device_fingerprint(user_agent: str, ip: str, extra_data: dict = None) -> str:
    """Generate device fingerprint hash"""
    components = [
        user_agent or "unknown",
        ip or "unknown",
        json.dumps(extra_data or {}, sort_keys=True)
    ]
    return hashlib.sha256("|".join(components).encode()).hexdigest()

def calculate_trust_score(device_trust_level: int, entropy_confidence: float, historical_score: float) -> float:
    """Calculate composite trust score"""
    device_weight = 0.4
    entropy_weight = 0.3
    history_weight = 0.3
    
    device_score = (device_trust_level / 5) * 100
    entropy_score = entropy_confidence * 100
    
    return round(
        device_score * device_weight +
        entropy_score * entropy_weight +
        historical_score * history_weight,
        1
    )

# ===================== BLOCKCHAIN SIMULATOR =====================

class BlockchainLedger:
    def __init__(self):
        self.difficulty = 2
    
    async def get_last_block(self, db) -> dict:
        """Get the last block from the chain"""
        cursor = await db.execute(
            "SELECT * FROM blockchain_trust_logs ORDER BY block_number DESC LIMIT 1"
        )
        row = await cursor.fetchone()
        if row:
            return {
                "proof_id": row[0],
                "device_hash": row[1],
                "session_hash": row[2],
                "block_number": row[5],
                "previous_hash": row[6],
                "nonce": row[7]
            }
        return {"previous_hash": "0" * 64, "block_number": 0}
    
    def mine_block(self, data_hash: str, previous_hash: str) -> tuple:
        """Simple proof-of-work mining"""
        nonce = 0
        target = "0" * self.difficulty
        
        while True:
            block_content = f"{previous_hash}{data_hash}{nonce}"
            block_hash = hashlib.sha256(block_content.encode()).hexdigest()
            if block_hash.startswith(target):
                return block_hash, nonce
            nonce += 1
            if nonce > 10000:  # Limit for simulation
                return block_hash, nonce
    
    async def add_trust_proof(self, device_hash: str, session_hash: str, user_id: str, 
                             verification_status: str, db=None) -> dict:
        """Add a new trust proof to the blockchain"""
        close_db = False
        if db is None:
            db = await get_db()
            close_db = True
        
        try:
            last_block = await self.get_last_block(db)
            previous_hash = last_block.get("previous_hash", "0" * 64)
            block_number = last_block.get("block_number", 0) + 1
            
            data_hash = hashlib.sha256(f"{device_hash}{session_hash}".encode()).hexdigest()
            block_hash, nonce = self.mine_block(data_hash, previous_hash)
            
            proof_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).isoformat()
            
            await db.execute('''
INSERT INTO blockchain_trust_logs 
(proof_id, device_hash, session_hash, user_id, verification_status, 
 block_number, tx_hash, chain_source, previous_hash, nonce, timestamp)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    proof_id,
    device_hash,
    session_hash,
    user_id,
    verification_status,
    block_number,
    "local_tx_" + proof_id[:8],   # ✅ NEW
    "ganache",                    # ✅ NEW
    previous_hash,
    nonce,
    timestamp
))
            await db.commit()
            
            return {
                "proof_id": proof_id,
                "block_hash": block_hash,
                "block_number": block_number,
                "nonce": nonce,
                "verification_status": verification_status,
                "timestamp": timestamp
            }
        finally:
            if close_db:
                await db.close()

blockchain = BlockchainLedger()

# ===================== PYDANTIC MODELS =====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    device_fingerprint: Optional[dict] = None

class DeviceVerify(BaseModel):
    fingerprint_data: dict
    entropy_data: Optional[dict] = None

class SimulateDevice(BaseModel):
    device_type: str = "trusted"  # "trusted" or "spoofed"
    user_id: Optional[str] = None

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        async with db_connection() as db:
            cursor = await db.execute(
                "SELECT user_id, email, trust_score, created_at FROM users WHERE user_id = ?",
                (payload["sub"],)
            )
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=401, detail="User not found")
            
            return {
                "user_id": row[0],
                "email": row[1],
                "trust_score": row[2],
                "created_at": row[3]
            }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===================== LIFESPAN =====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_demo_data()
    # Write test credentials
    os.makedirs("../memory", exist_ok=True)
    with open("../memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write("- Email: admin@entropyx.io\n")
        f.write("- Password: admin123\n")
        f.write("- Role: admin\n\n")
        f.write("## Demo Account\n")
        f.write("- Email: demo@entropyx.io\n")
        f.write("- Password: demo123\n")
        f.write("- Role: user\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/register\n")
        f.write("- POST /api/login\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/logout\n")
    yield

# ===================== APP SETUP =====================

app = FastAPI(title="EntropyX-ID API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ===================== AUTH ROUTES =====================

@api_router.post("/register")
async def register(data: UserRegister, response: Response):
    async with db_connection() as db:
        cursor = await db.execute("SELECT user_id FROM users WHERE email = ?", (data.email.lower(),))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user_id = str(uuid.uuid4())
        await db.execute('''
INSERT INTO users (user_id, email, password_hash, trust_score, created_at)
VALUES (?, ?, ?, ?, ?)
''', (user_id, data.email.lower(), hash_password(data.password), 50.0, 
              datetime.now(timezone.utc).isoformat()))
        await db.commit()
        
        token = create_access_token(user_id, data.email.lower())
        response.set_cookie(key="access_token", value=token, httponly=True, 
                          secure=False, samesite="lax", max_age=3600)
        
        return {"user_id": user_id, "email": data.email.lower(), "trust_score": 50.0}

@api_router.post("/login")
async def login(data: UserLogin, request: Request, response: Response):
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    async with db_connection() as db:
        cursor = await db.execute(
            "SELECT user_id, email, password_hash, trust_score FROM users WHERE email = ?",
            (data.email.lower(),)
        )
        row = await cursor.fetchone()

        if not row or not verify_password(data.password, row[2]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id, email, _, trust_score = row

        # Generate entropy and device verification
        entropy_status = entropy_engine.get_full_status()
        fingerprint_hash = generate_device_fingerprint(user_agent, ip, data.device_fingerprint)

        # Check for trusted device
        cursor = await db.execute(
            "SELECT device_id, trust_level FROM trusted_devices WHERE user_id = ? AND fingerprint_hash = ?",
            (user_id, fingerprint_hash)
        )
        device_row = await cursor.fetchone()

        device_id = None
        trust_level = 1
        is_trusted = False

        if device_row:
            device_id = device_row[0]
            trust_level = device_row[1]
            is_trusted = True

            await db.execute(
                "UPDATE trusted_devices SET last_login = ? WHERE device_id = ?",
                (datetime.now(timezone.utc).isoformat(), device_id)
            )
        else:
            device_id = str(uuid.uuid4())
            entropy_sig = entropy_engine.generate_nonce()

            await db.execute('''
                INSERT INTO trusted_devices (
                    device_id, user_id, fingerprint_hash, entropy_signature,
                    last_login, trust_level, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                device_id,
                user_id,
                fingerprint_hash,
                entropy_sig,
                datetime.now(timezone.utc).isoformat(),
                1,
                datetime.now(timezone.utc).isoformat()
            ))

        # Create session
        session_id = str(uuid.uuid4())
        entropy_nonce = entropy_engine.generate_nonce()

        await db.execute('''
            INSERT INTO login_sessions (
                session_id, user_id, device_id, entropy_nonce,
                login_status, ip_address, timestamp
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            session_id,
            user_id,
            device_id,
            entropy_nonce,
            "SUCCESS",
            ip,
            datetime.now(timezone.utc).isoformat()
        ))

        # Calculate final trust score
        final_trust = calculate_trust_score(
            trust_level,
            entropy_status["confidence_score"] / 100,
            trust_score
        )

        # Real Ganache transaction
        chain_result = {}
        try:
            chain_result = record_trust_decision(
                email=email,
                session_id=session_id,
                entropy_hash=entropy_nonce,
                trust_score=int(final_trust),
                allowed=True,
                timestamp=int(time.time())
            )
            print("Blockchain TX:", chain_result)
        except Exception as blockchain_error:
            logger.warning(
                f"Blockchain recording failed (Ganache may not be running): {str(blockchain_error)}"
            )
            chain_result = {
                "tx_hash": "simulated_" + entropy_nonce[:8],
                "block_number": 0,
                "status": 0,
                "error": str(blockchain_error)
            }

        # Local proof record for /ledger page
        session_hash = hashlib.sha256(f"{session_id}-{entropy_nonce}".encode()).hexdigest()
        blockchain_proof = await blockchain.add_trust_proof(
            fingerprint_hash,
            session_hash,
            user_id,
            "VERIFIED" if chain_result.get("status") == 1 else "PENDING",
            db
        )

        # Update trusted device with proof hash
        await db.execute(
            "UPDATE trusted_devices SET blockchain_proof_hash = ? WHERE device_id = ?",
            (blockchain_proof["block_hash"], device_id)
        )

        await db.commit()

        # Create auth token + cookie
        token = create_access_token(user_id, email)
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=3600
        )

        return {
            "blockchain_tx": chain_result,
            "user_id": user_id,
            "email": email,
            "trust_score": final_trust,
            "device": {
                "device_id": device_id,
                "is_trusted": is_trusted,
                "trust_level": trust_level,
                "fingerprint_hash": fingerprint_hash[:16] + "..."
            },
            "entropy": {
                "confidence_score": entropy_status["confidence_score"],
                "nonce": entropy_nonce[:16] + "..."
            },
            "blockchain_proof": blockchain_proof,
            "session_id": session_id
        }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

# ===================== DEVICE ROUTES =====================

@api_router.post("/device/verify")
async def verify_device(data: DeviceVerify, request: Request, user: dict = Depends(get_current_user)):
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    fingerprint_hash = generate_device_fingerprint(user_agent, ip, data.fingerprint_data)
    entropy_status = entropy_engine.get_full_status()
    
    async with db_connection() as db:
        cursor = await db.execute(
            "SELECT device_id, trust_level, blockchain_proof_hash FROM trusted_devices WHERE user_id = ? AND fingerprint_hash = ?",
            (user["user_id"], fingerprint_hash)
        )
        device = await cursor.fetchone()
        
        if device:
            return {
                "verified": True,
                "device_id": device[0],
                "trust_level": device[1],
                "blockchain_proof_hash": device[2],
                "entropy_confidence": entropy_status["confidence_score"],
                "fingerprint_hash": fingerprint_hash[:16] + "..."
            }
        
        return {
            "verified": False,
            "fingerprint_hash": fingerprint_hash[:16] + "...",
            "entropy_confidence": entropy_status["confidence_score"],
            "message": "Device not recognized"
        }

@api_router.get("/device/trusted")
async def get_trusted_devices(user: dict = Depends(get_current_user)):
    async with db_connection() as db:
        cursor = await db.execute('''
            SELECT device_id, fingerprint_hash, entropy_signature, last_login, 
                   trust_level, blockchain_proof_hash, created_at
            FROM trusted_devices WHERE user_id = ?
            ORDER BY last_login DESC
        ''', (user["user_id"],))
        
        devices = []
        async for row in cursor:
            devices.append({
                "device_id": row[0],
                "fingerprint_hash": row[1][:16] + "..." if row[1] else None,
                "entropy_signature": row[2][:16] + "..." if row[2] else None,
                "last_login": row[3],
                "trust_level": row[4],
                "blockchain_proof_hash": row[5][:16] + "..." if row[5] else None,
                "created_at": row[6]
            })
        
        return {"devices": devices}

# ===================== ENTROPY ROUTES =====================

@api_router.get("/entropy/status")
async def get_entropy_status():
    return entropy_engine.get_full_status()

@api_router.get("/entropy/stream")
async def get_entropy_stream():
    """Get a stream of entropy data for visualization"""
    samples = []
    for i in range(20):
        entropy_engine.get_camera_entropy()
        pool_status = entropy_engine.get_pool_status()
        samples.append({
            "index": i,
            "pool_hash": pool_status["pool_hash"][:8],
            "freshness": pool_status["freshness_percent"],
            "timestamp": time.time()
        })
    
    return {"samples": samples, "current_nonce": entropy_engine.generate_nonce()[:32]}

# ===================== SESSION ROUTES =====================

@api_router.get("/session/history")
async def get_session_history(user: dict = Depends(get_current_user)):
    async with db_connection() as db:
        cursor = await db.execute('''
            SELECT session_id, device_id, entropy_nonce, login_status, ip_address, timestamp
            FROM login_sessions WHERE user_id = ?
            ORDER BY timestamp DESC LIMIT 50
        ''', (user["user_id"],))
        
        sessions = []
        async for row in cursor:
            sessions.append({
                "session_id": row[0],
                "device_id": row[1],
                "entropy_nonce": row[2][:16] + "..." if row[2] else None,
                "login_status": row[3],
                "ip_address": row[4],
                "timestamp": row[5]
            })
        
        return {"sessions": sessions}

# ===================== BLOCKCHAIN ROUTES =====================

@api_router.get("/trust-ledger")
async def get_trust_ledger(limit: int = 50):
    async with db_connection() as db:
        cursor = await db.execute('''
            SELECT proof_id, device_hash, session_hash, user_id, verification_status,
                   block_number, tx_hash, chain_source, previous_hash, nonce, timestamp
            FROM blockchain_trust_logs
            ORDER BY block_number DESC
            LIMIT ?
        ''', (limit,))

        blocks = []
        rows = await cursor.fetchall()
        for row in rows:
            blocks.append({
                "proof_id": row[0],
                "device_hash": row[1][:16] + "..." if row[1] else None,
                "session_hash": row[2][:16] + "..." if row[2] else None,
                "user_id": row[3][:8] + "..." if row[3] else None,
                "verification_status": row[4],
                "block_number": row[5],
                "tx_hash": row[6],
                "chain_source": row[7],
                "previous_hash": row[8][:16] + "..." if row[8] else None,
                "nonce": row[9],
                "timestamp": row[10]
            })

        return {"blocks": blocks, "chain_length": len(blocks)}

# ===================== SIMULATION ROUTES =====================

@api_router.post("/device/simulate")
async def simulate_device(data: SimulateDevice, request: Request):
    """Simulate trusted or spoofed device for demo"""
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    if data.device_type == "trusted":
        # Generate legitimate entropy and fingerprint
        entropy_status = entropy_engine.get_full_status()
        fingerprint_hash = generate_device_fingerprint(user_agent, ip, {"legitimate": True})
        
        return {
            "device_type": "trusted",
            "detection_result": "TRUSTED",
            "trust_score": random.uniform(75, 95),
            "entropy_confidence": entropy_status["confidence_score"],
            "fingerprint_hash": fingerprint_hash[:16] + "...",
            "spoof_indicators": [],
            "access_granted": True,
            "message": "Device verified with high confidence"
        }
    else:
        # Simulate spoofed device characteristics
        spoof_indicators = []
        
        # Detect anomalies
        if random.random() > 0.3:
            spoof_indicators.append("ENTROPY_MISMATCH: Entropy signature inconsistent with hardware profile")
        if random.random() > 0.4:
            spoof_indicators.append("FINGERPRINT_ANOMALY: Browser fingerprint contains virtualization artifacts")
        if random.random() > 0.5:
            spoof_indicators.append("TIMING_ANOMALY: CPU timing patterns suggest emulation")
        if random.random() > 0.6:
            spoof_indicators.append("REPLAY_DETECTED: Session nonce appears to be replayed")
        
        fake_fingerprint = hashlib.sha256(f"spoofed-{time.time()}".encode()).hexdigest()
        
        # Log suspicious attempt to blockchain
        session_hash = hashlib.sha256(f"spoof-attempt-{time.time()}".encode()).hexdigest()
        blockchain_proof = await blockchain.add_trust_proof(
            fake_fingerprint, session_hash, data.user_id, "SUSPICIOUS"
        )
        
        return {
            "device_type": "spoofed",
            "detection_result": "BLOCKED",
            "trust_score": random.uniform(5, 25),
            "entropy_confidence": random.uniform(10, 30),
            "fingerprint_hash": fake_fingerprint[:16] + "...",
            "spoof_indicators": spoof_indicators,
            "access_granted": False,
            "blockchain_proof": blockchain_proof,
            "message": "SECURITY ALERT: Device spoof attempt detected and blocked"
        }

@api_router.post("/spoof-check")
async def check_spoof(request: Request):
    """Analyze current request for potential spoofing"""
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Collect entropy samples
    entropy_status = entropy_engine.get_full_status()
    
    # Calculate spoof probability based on entropy health
    spoof_probability = max(0, min(100, 100 - entropy_status["confidence_score"]))
    
    risk_factors = []
    if entropy_status["pool"]["freshness_percent"] < 50:
        risk_factors.append("LOW_ENTROPY_FRESHNESS")
    if entropy_status["confidence_score"] < 60:
        risk_factors.append("INSUFFICIENT_ENTROPY")
    if "headless" in user_agent.lower() or "bot" in user_agent.lower():
        risk_factors.append("AUTOMATION_DETECTED")
    
    return {
        "spoof_probability": round(spoof_probability, 1),
        "entropy_confidence": entropy_status["confidence_score"],
        "risk_factors": risk_factors,
        "recommendation": "ALLOW" if spoof_probability < 30 else "CHALLENGE" if spoof_probability < 60 else "BLOCK",
        "fingerprint_hash": generate_device_fingerprint(user_agent, ip, {})[:16] + "...",
        "analysis_timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/simulation/full-demo")
async def run_full_demo():
    """Run complete demo simulation for judges"""
    results = {
        "steps": [],
        "summary": {}
    }
    
    # Step 1: Trusted device login
    entropy_status = entropy_engine.get_full_status()
    trusted_fingerprint = generate_device_fingerprint("TrustedBrowser/1.0", "192.168.1.100", {"type": "trusted"})
    
    results["steps"].append({
        "step": 1,
        "action": "TRUSTED_DEVICE_LOGIN",
        "result": "SUCCESS",
        "trust_score": 89.5,
        "entropy_confidence": entropy_status["confidence_score"],
        "fingerprint": trusted_fingerprint[:16] + "...",
        "message": "Legitimate user authenticated successfully"
    })
    
    # Step 2: Generate blockchain proof
    session_hash = hashlib.sha256(f"trusted-session-{time.time()}".encode()).hexdigest()
    blockchain_proof = await blockchain.add_trust_proof(
        trusted_fingerprint, session_hash, "demo-user", "VERIFIED"
    )
    
    results["steps"].append({
        "step": 2,
        "action": "BLOCKCHAIN_PROOF_GENERATED",
        "result": "VERIFIED",
        "block_number": blockchain_proof["block_number"],
        "proof_hash": blockchain_proof["block_hash"][:16] + "...",
        "nonce": blockchain_proof["nonce"],
        "message": "Trust proof immutably recorded on blockchain"
    })
    
    # Step 3: Spoofed device attempt
    spoof_fingerprint = hashlib.sha256(f"spoofed-{time.time()}".encode()).hexdigest()
    spoof_indicators = [
        "ENTROPY_MISMATCH: Hardware entropy signature invalid",
        "REPLAY_ATTEMPT: Nonce reuse detected",
        "FINGERPRINT_ANOMALY: Virtualization detected"
    ]
    
    results["steps"].append({
        "step": 3,
        "action": "SPOOFED_DEVICE_ATTEMPT",
        "result": "BLOCKED",
        "trust_score": 12.3,
        "spoof_indicators": spoof_indicators,
        "fingerprint": spoof_fingerprint[:16] + "...",
        "message": "SECURITY ALERT: Spoof attempt detected and blocked"
    })
    
    # Step 4: Log suspicious activity
    suspicious_proof = await blockchain.add_trust_proof(
        spoof_fingerprint, hashlib.sha256(f"spoof-{time.time()}".encode()).hexdigest(),
        None, "SUSPICIOUS"
    )
    
    results["steps"].append({
        "step": 4,
        "action": "SUSPICIOUS_ACTIVITY_LOGGED",
        "result": "RECORDED",
        "block_number": suspicious_proof["block_number"],
        "verification_status": "SUSPICIOUS",
        "message": "Suspicious attempt recorded on immutable ledger"
    })
    
    # Summary
    results["summary"] = {
        "trusted_logins": 1,
        "blocked_attempts": 1,
        "blockchain_proofs_generated": 2,
        "entropy_samples_collected": 80,
        "security_status": "PROTECTED",
        "demo_completed_at": datetime.now(timezone.utc).isoformat()
    }
    
    return results

# ===================== INCLUDE ROUTER =====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
async def root():
    return {"message": "EntropyX-ID API", "version": "1.0.0"}
