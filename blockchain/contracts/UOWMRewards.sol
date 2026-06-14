// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * UOWM Rewards Points (UOWMP)
 *
 * Two on-chain paths, both permanent and tamper-proof:
 *
 *   awardAttendance  — student has a MetaMask wallet: mints ERC-20 tokens TO
 *                      their address and emits AttendanceRecorded.
 *
 *   recordAttendance — student has no wallet yet: emits AttendanceLogged with
 *                      their student ID so the attendance still hits the chain.
 *
 * Either way, every scan produces a transaction hash stored in SQLite and
 * verifiable on Polygonscan forever.
 */
contract UOWMRewards is ERC20, Ownable {

    event AttendanceRecorded(
        address indexed student,
        uint256 points,
        string  lectureId,
        uint256 timestamp
    );

    event AttendanceLogged(
        string studentId,
        string lectureId,
        uint256 timestamp
    );

    mapping(bytes32 => bool) private _minted;  // keyed on (address, lectureId)
    mapping(bytes32 => bool) private _logged;  // keyed on (studentId, lectureId)

    constructor(address initialOwner)
        ERC20("UOWM Rewards Points", "UOWMP")
        Ownable(initialOwner)
    {}

    // ── Path A: student has a wallet ─────────────────────────────────────────

    function awardAttendance(
        address student,
        uint256 points,
        string calldata lectureId
    ) external onlyOwner {
        bytes32 key = keccak256(abi.encodePacked(student, lectureId));
        require(!_minted[key], "UOWMP: already minted for this lecture");
        _minted[key] = true;
        _mint(student, points * 1e18);
        emit AttendanceRecorded(student, points, lectureId, block.timestamp);
    }

    function hasMinted(address student, string calldata lectureId) external view returns (bool) {
        return _minted[keccak256(abi.encodePacked(student, lectureId))];
    }

    // ── Path B: student has no wallet — log attendance without minting ────────

    function recordAttendance(
        string calldata studentId,
        string calldata lectureId
    ) external onlyOwner {
        bytes32 key = keccak256(abi.encodePacked(studentId, lectureId));
        require(!_logged[key], "UOWMP: already logged for this lecture");
        _logged[key] = true;
        emit AttendanceLogged(studentId, lectureId, block.timestamp);
    }

    function hasLogged(string calldata studentId, string calldata lectureId) external view returns (bool) {
        return _logged[keccak256(abi.encodePacked(studentId, lectureId))];
    }

    // ── Soulbound: block all transfers ────────────────────────────────────────

    function transfer(address, uint256) public pure override returns (bool) {
        revert("UOWMP: soulbound, non-transferable");
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("UOWMP: soulbound, non-transferable");
    }

    function approve(address, uint256) public pure override returns (bool) {
        revert("UOWMP: soulbound, non-transferable");
    }
}
