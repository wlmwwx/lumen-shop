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
});
