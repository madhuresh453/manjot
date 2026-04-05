// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

contract TrustLedger {
    struct TrustRecord {
        bytes32 userHash;
        bytes32 sessionHash;
        bytes32 entropyHash;
        uint256 trustScore;
        bool allowed;
        uint256 timestamp;
    }

    TrustRecord[] private records;

    event TrustRecorded(
        uint256 indexed recordId,
        bytes32 indexed userHash,
        bytes32 indexed sessionHash,
        uint256 trustScore,
        bool allowed,
        uint256 timestamp
    );

    function recordTrustDecision(
        bytes32 userHash,
        bytes32 sessionHash,
        bytes32 entropyHash,
        uint256 trustScore,
        bool allowed,
        uint256 timestamp
    ) external {
        records.push(
            TrustRecord(
                userHash,
                sessionHash,
                entropyHash,
                trustScore,
                allowed,
                timestamp
            )
        );

        emit TrustRecorded(
            records.length - 1,
            userHash,
            sessionHash,
            trustScore,
            allowed,
            timestamp
        );
    }

    function getRecord(uint256 index)
        external
        view
        returns (
            bytes32,
            bytes32,
            bytes32,
            uint256,
            bool,
            uint256
        )
    {
        require(index < records.length, "Invalid index");

        TrustRecord storage record = records[index];
        return (
            record.userHash,
            record.sessionHash,
            record.entropyHash,
            record.trustScore,
            record.allowed,
            record.timestamp
        );
    }

    function getRecordCount() external view returns (uint256) {
        return records.length;
    }
}