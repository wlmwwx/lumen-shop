/**
 * Tests for CartContext component
 * Testing cart logic with simplified component tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

import React from "react";
import { CartProvider, useCart } from "@/components/cart/cart-context";

describe("CartContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("initial state", () => {
    it("should have empty cart initially after hydration", async () => {
      function TestConsumer() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <span data-testid="subtotal">{cart.subtotal}</span>
            <span data-testid="is-open">{String(cart.isOpen)}</span>
          </div>
        );
      }

      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("0");
      });
      expect(screen.getByTestId("subtotal")).toHaveTextContent("0");
      expect(screen.getByTestId("is-open")).toHaveTextContent("false");
    });
  });

  describe("addItem", () => {
    it("should add item to cart", async () => {
      function AddItemTest() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <span data-testid="is-open">{String(cart.isOpen)}</span>
            <button onClick={() => cart.addItem({ 
              productId: "p1", 
              slug: "test", 
              title: "Test Product", 
              image: "", 
              price: 100 
            })}>
              Add Item
            </button>
          </div>
        );
      }

      render(
        <CartProvider>
          <AddItemTest />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole("button", { name: "Add Item" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1");
      });
    });

    it("should open cart drawer when adding item", async () => {
      function OpenDrawerTest() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="is-open">{String(cart.isOpen)}</span>
            <button onClick={() => cart.addItem({ 
              productId: "p1", 
              slug: "test", 
              title: "Test", 
              image: "", 
              price: 100 
            })}>
              Add
            </button>
          </div>
        );
      }

      render(
        <CartProvider>
          <OpenDrawerTest />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole("button", { name: "Add" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("is-open")).toHaveTextContent("true");
      });
    });
  });

  describe("removeItem", () => {
    it("should remove item from cart", async () => {
      function RemoveTest() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <button onClick={() => cart.addItem({ 
              productId: "p1", 
              slug: "test", 
              title: "Test", 
              image: "", 
              price: 100 
            })}>
              Add
            </button>
            <button onClick={() => cart.removeItem("p1")}>Remove</button>
          </div>
        );
      }

      render(
        <CartProvider>
          <RemoveTest />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole("button", { name: "Add" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1");
      });

      await act(async () => {
        screen.getByRole("button", { name: "Remove" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("0");
      });
    });
  });

  describe("clear", () => {
    it("should clear all items", async () => {
      function ClearTest() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <button onClick={() => cart.addItem({ 
              productId: "p1", 
              slug: "test", 
              title: "Test", 
              image: "", 
              price: 100 
            })}>
              Add
            </button>
            <button onClick={() => cart.clear()}>Clear</button>
          </div>
        );
      }

      render(
        <CartProvider>
          <ClearTest />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole("button", { name: "Add" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1");
      });

      await act(async () => {
        screen.getByRole("button", { name: "Clear" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("0");
      });
    });
  });

  describe("subtotal calculation", () => {
    it("should calculate subtotal correctly", async () => {
      function SubtotalTest() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="subtotal">{cart.subtotal}</span>
            <button onClick={() => cart.addItem({ 
              productId: "p1", 
              slug: "test", 
              title: "Test 100", 
              image: "", 
              price: 100 
            })}>
              Add 100
            </button>
            <button onClick={() => cart.addItem({ 
              productId: "p2", 
              slug: "test2", 
              title: "Test 50", 
              image: "", 
              price: 50 
            })}>
              Add 50
            </button>
          </div>
        );
      }

      render(
        <CartProvider>
          <SubtotalTest />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole("button", { name: "Add 100" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("subtotal")).toHaveTextContent("100");
      });

      await act(async () => {
        screen.getByRole("button", { name: "Add 50" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("subtotal")).toHaveTextContent("150");
      });
    });
  });

  describe("openCart/closeCart", () => {
    it("should open and close cart", async () => {
      function OpenCloseTest() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="is-open">{String(cart.isOpen)}</span>
            <button onClick={() => cart.openCart()}>Open</button>
            <button onClick={() => cart.closeCart()}>Close</button>
          </div>
        );
      }

      render(
        <CartProvider>
          <OpenCloseTest />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("false");

      await act(async () => {
        screen.getByRole("button", { name: "Open" }).click();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("true");

      await act(async () => {
        screen.getByRole("button", { name: "Close" }).click();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("false");
    });
  });

  describe("variant support", () => {
    it("should handle items with different variants as separate items", async () => {
      function VariantTest() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <button onClick={() => cart.addItem({ 
              productId: "p1", 
              slug: "test", 
              title: "Test", 
              image: "", 
              price: 100, 
              variant: "蓝色" 
            })}>
              Add Blue
            </button>
            <button onClick={() => cart.addItem({ 
              productId: "p1", 
              slug: "test", 
              title: "Test", 
              image: "", 
              price: 100, 
              variant: "红色" 
            })}>
              Add Red
            </button>
          </div>
        );
      }

      render(
        <CartProvider>
          <VariantTest />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole("button", { name: "Add Blue" }).click();
      });
      await act(async () => {
        screen.getByRole("button", { name: "Add Red" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("2");
      });
    });
  });

  describe("localStorage persistence", () => {
    it("should persist cart to localStorage", async () => {
      function PersistTest() {
        const cart = useCart();
        if (!cart) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <button onClick={() => cart.addItem({ 
              productId: "p1", 
              slug: "test", 
              title: "Test", 
              image: "", 
              price: 100 
            })}>
              Add
            </button>
          </div>
        );
      }

      render(
        <CartProvider>
          <PersistTest />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole("button", { name: "Add" }).click();
      });

      await waitFor(() => {
        const stored = localStorage.getItem("lumen_cart");
        expect(stored).toBeTruthy();
        const items = JSON.parse(stored!);
        expect(items).toHaveLength(1);
      });
    });
  });
});
