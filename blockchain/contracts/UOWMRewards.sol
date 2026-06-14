// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * UOWM Rewards Points (UOWMP)
 *
 * Soulbound ERC-20: tokens are non-transferable and can only be minted
 * by the contract owner (the server wallet) when a student attends a lecture.
 *
 * Each lecture attendance mints `points * 1e18` tokens and emits an
 * AttendanceRecorded event that serves as a permanent, verifiable proof.
 */
contract UOWMRewards is ERC20, Ownable {

    event AttendanceRecorded(
        address indexed student,
        uint256 points,
        string  lectureId,
        uint256 timestamp
    );

    // keccak256(student, lectureId) → already minted
    mapping(bytes32 => bool) private _minted;

    constructor(address initialOwner)
        ERC20("UOWM Rewards Points", "UOWMP")
        Ownable(initialOwner)
    {}

    // -------------------------------------------------------------------------
    // Minting — only the server wallet (owner) can call this
    // -------------------------------------------------------------------------

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

    // Read-only: check whether a mint already happened for a (student, lecture) pair
    function hasMinted(address student, string calldata lectureId) external view returns (bool) {
        return _minted[keccak256(abi.encodePacked(student, lectureId))];
    }

    // -------------------------------------------------------------------------
    // Soulbound: block all transfers so points can't be traded or gifted
    // -------------------------------------------------------------------------

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
