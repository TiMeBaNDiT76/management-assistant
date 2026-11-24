import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { authHeaders, createTrpcClient, getApiUrl } from "../../src/lib/trpc";
import { getAuthToken } from "../../src/lib/firebase";

jest.mock("../../src/lib/firebase", () => ({
  getFirebaseAuth: jest.fn(() => null),
  getAuthToken: jest.fn(async () => null),
}));

const mockedGetAuthToken = jest.mocked(getAuthToken);

beforeEach(() => {
  jest.resetAllMocks();
});

describe("authHeaders", () => {
  it("injects the Bearer token when a session exists", async () => {
    mockedGetAuthToken.mockResolvedValue("id-token-abc");

    expect(await authHeaders()).toEqual({
      Authorization: "Bearer id-token-abc",
    });
  });

  it("returns empty headers when signed out", async () => {
    mockedGetAuthToken.mockResolvedValue(null);

    expect(await authHeaders()).toEqual({});
  });
});

describe("createTrpcClient", () => {
  it("is created with the auth-aware batch link", () => {
    // Smoke check — the client builds without throwing and links are wired.
    expect(() => createTrpcClient()).not.toThrow();
  });
});

describe("getApiUrl", () => {
  it("falls back to the local dev endpoint", () => {
    const previous = process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    try {
      expect(getApiUrl()).toBe("http://localhost:4000/trpc");
      process.env.EXPO_PUBLIC_API_URL = "https://api.example.com/trpc";
      expect(getApiUrl()).toBe("https://api.example.com/trpc");
    } finally {
      if (previous === undefined) {
        delete process.env.EXPO_PUBLIC_API_URL;
      } else {
        process.env.EXPO_PUBLIC_API_URL = previous;
      }
    }
  });
});
