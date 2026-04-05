import os
from pathlib import Path
from web3 import Web3
from solcx import compile_source, install_solc, set_solc_version
from dotenv import load_dotenv
import json

# 🔐 Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)


GANACHE_URL = os.getenv("GANACHE_URL", "http://127.0.0.1:7545")
ACCOUNT_ADDRESS = os.getenv("GANACHE_ACCOUNT_ADDRESS")
PRIVATE_KEY = os.getenv("GANACHE_PRIVATE_KEY")

CONTRACT_PATH = Path("./TrustLedger.sol").resolve()


def main():
    print("Connecting to Ganache...")
    w3 = Web3(Web3.HTTPProvider(GANACHE_URL))

    if not w3.is_connected():
        raise RuntimeError("❌ Could not connect to Ganache")

    print("✅ Connected to Ganache")

    # 🔍 Validate env variables
    if not ACCOUNT_ADDRESS or not PRIVATE_KEY:
        raise ValueError("❌ Missing ACCOUNT_ADDRESS or PRIVATE_KEY in .env")

    # Clean private key (remove spaces/newlines)
    private_key = PRIVATE_KEY.strip()

    account = Web3.to_checksum_address(ACCOUNT_ADDRESS)

    # 💰 Check balance
    balance = w3.eth.get_balance(account)
    print("Account:", account)
    print("Balance:", w3.from_wei(balance, "ether"), "ETH")

    if balance == 0:
        raise ValueError("❌ Account has 0 ETH. Check Ganache account!")

    # ⚙️ Install Solidity compiler
    print("Installing Solidity compiler 0.7.6...")
    install_solc("0.7.6")
    set_solc_version("0.7.6")

    # 📄 Read contract
    source_code = CONTRACT_PATH.read_text()

    print("Compiling contract...")
    compiled = compile_source(
        source_code,
        output_values=["abi", "bin"],
        evm_version="istanbul",
        optimize=False,
    )

    contract_id, contract_interface = compiled.popitem()
    abi = contract_interface["abi"]
    bytecode = contract_interface["bin"]

    contract = w3.eth.contract(abi=abi, bytecode=bytecode)

    nonce = w3.eth.get_transaction_count(account)

    print("Building deployment transaction...")
    tx = contract.constructor().build_transaction({
        "from": account,
        "nonce": nonce,
        "gas": 5000000,
        "gasPrice": w3.to_wei("2", "gwei"),
    })

    print("Signing transaction...")
    signed_tx = w3.eth.account.sign_transaction(tx, private_key)

    print("Sending transaction...")
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print("Transaction hash:", tx_hash.hex())

    print("Waiting for receipt...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    print("\n🔥 === DEPLOYMENT SUCCESS === 🔥")
    print("📌 Contract address:", receipt.contractAddress)
    print("📦 Block number:", receipt.blockNumber)

    # 💾 Save ABI
    abi_path = Path("trust_ledger_abi.json")
    abi_path.write_text(json.dumps(abi, indent=2))
    print("✅ ABI saved to:", abi_path.resolve())


if __name__ == "__main__":
    main()