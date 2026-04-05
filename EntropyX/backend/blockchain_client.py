import json
import os
from hashlib import sha256
from web3 import Web3
from dotenv import load_dotenv
from pathlib import Path

# 🔐 Load .env correctly
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

GANACHE_URL = os.getenv("GANACHE_URL", "http://127.0.0.1:7545")
CONTRACT_ADDRESS = os.getenv("TRUST_LEDGER_ADDRESS")
PRIVATE_KEY = os.getenv("GANACHE_PRIVATE_KEY", "").strip()
ACCOUNT_ADDRESS = os.getenv("GANACHE_ACCOUNT_ADDRESS")

# ❗ Validate env
if not CONTRACT_ADDRESS:
    raise ValueError("❌ TRUST_LEDGER_ADDRESS missing in .env")

if not ACCOUNT_ADDRESS or not PRIVATE_KEY:
    raise ValueError("❌ ACCOUNT_ADDRESS or PRIVATE_KEY missing")

w3 = Web3(Web3.HTTPProvider(GANACHE_URL))

# 📄 Load ABI
with open(os.path.join(os.path.dirname(__file__), "trust_ledger_abi.json"), "r") as f:
    TRUST_LEDGER_ABI = json.load(f)

contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_ADDRESS),
    abi=TRUST_LEDGER_ABI
)

def hash_text(value: str) -> bytes:
    return sha256(value.encode("utf-8")).digest()

def record_trust_decision(
    email: str,
    session_id: str,
    entropy_hash: str,
    trust_score: int,
    allowed: bool,
    timestamp: int
):
    user_hash = hash_text(email)
    session_hash = hash_text(session_id)
    entropy_hash_bytes = hash_text(entropy_hash)

    account = Web3.to_checksum_address(ACCOUNT_ADDRESS)
    nonce = w3.eth.get_transaction_count(account)

    tx = contract.functions.recordTrustDecision(
        user_hash,
        session_hash,
        entropy_hash_bytes,
        int(trust_score),
        bool(allowed),
        int(timestamp)
    ).build_transaction({
        "from": account,
        "nonce": nonce,
        "gas": 500000,
        "gasPrice": w3.to_wei("2", "gwei"),
    })

    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    

    return {
        "tx_hash": tx_hash.hex(),
        "block_number": -1,
        "status": "pending",
    }

def get_record_count():
    return contract.functions.getRecordCount().call()

def get_record(index: int):
    return contract.functions.getRecord(index).call()