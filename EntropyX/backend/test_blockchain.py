from blockchain_client import record_trust_decision
import time

res = record_trust_decision(
    email="admin@entropyx.io",
    session_id="session123",
    entropy_hash="entropy123",
    trust_score=95,
    allowed=True,
    timestamp=int(time.time())
)

print(res)