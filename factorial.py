def factorial(n: int) -> int:
    """Calculate factorial of a non-negative integer n."""
    if n < 0:
        raise ValueError("Negative input not allowed")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

if __name__ == "__main__":
    print(f"Factorial of 5 is {factorial(5)}")
