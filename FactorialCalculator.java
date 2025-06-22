public class FactorialCalculator {

    public static long factorial(int n) {
        if (n < 0) throw new IllegalArgumentException("Negative input not allowed");
        long result = 1;
        for (int i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    public static void main(String[] args) {
        int num = 5;
        System.out.println("Factorial of " + num + " is " + factorial(num));
    }
}
