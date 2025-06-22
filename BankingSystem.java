/**
 * Banking System Core Module
 * ==========================
 * 
 * A comprehensive banking system implementation with account management,
 * transaction processing, and security features.
 * 
 * @author Banking Development Team
 * @version 2.1.0
 * @since 2024-01-10
 */

package com.bank.core;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.security.SecureRandom;
import java.util.regex.Pattern;

/**
 * Represents a bank account with basic information and balance
 */
public class Account {
    private final String accountNumber;
    private final String customerName;
    private final String customerId;
    private final AccountType type;
    private BigDecimal balance;
    private final LocalDateTime createdAt;
    private LocalDateTime lastTransactionDate;
    private boolean isActive;
    private final ReentrantLock accountLock;
    
    public enum AccountType {
        CHECKING, SAVINGS, BUSINESS, CREDIT
    }
    
    public Account(String accountNumber, String customerName, String customerId, 
                   AccountType type, BigDecimal initialBalance) {
        this.accountNumber = accountNumber;
        this.customerName = customerName;
        this.customerId = customerId;
        this.type = type;
        this.balance = initialBalance.setScale(2, RoundingMode.HALF_UP);
        this.createdAt = LocalDateTime.now();
        this.lastTransactionDate = LocalDateTime.now();
        this.isActive = true;
        this.accountLock = new ReentrantLock();
    }
    
    // Getters
    public String getAccountNumber() { return accountNumber; }
    public String getCustomerName() { return customerName; }
    public String getCustomerId() { return customerId; }
    public AccountType getType() { return type; }
    public BigDecimal getBalance() { return balance; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastTransactionDate() { return lastTransactionDate; }
    public boolean isActive() { return isActive; }
    
    // Setters with validation
    public void setBalance(BigDecimal balance) {
        this.balance = balance.setScale(2, RoundingMode.HALF_UP);
        this.lastTransactionDate = LocalDateTime.now();
    }
    
    public void setActive(boolean active) {
        this.isActive = active;
    }
    
    public ReentrantLock getLock() {
        return accountLock;
    }
    
    @Override
    public String toString() {
        return String.format("Account{number='%s', name='%s', type=%s, balance=$%.2f, active=%s}",
                accountNumber, customerName, type, balance, isActive);
    }
}

/**
 * Represents a financial transaction
 */
public class Transaction {
    private final String transactionId;
    private final String fromAccount;
    private final String toAccount;
    private final BigDecimal amount;
    private final TransactionType type;
    private final LocalDateTime timestamp;
    private final String description;
    private TransactionStatus status;
    
    public enum TransactionType {
        DEPOSIT, WITHDRAWAL, TRANSFER, FEE, INTEREST
    }
    
    public enum TransactionStatus {
        PENDING, COMPLETED, FAILED, CANCELLED
    }
    
    public Transaction(String transactionId, String fromAccount, String toAccount,
                      BigDecimal amount, TransactionType type, String description) {
        this.transactionId = transactionId;
        this.fromAccount = fromAccount;
        this.toAccount = toAccount;
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.type = type;
        this.timestamp = LocalDateTime.now();
        this.description = description;
        this.status = TransactionStatus.PENDING;
    }
    
    // Getters
    public String getTransactionId() { return transactionId; }
    public String getFromAccount() { return fromAccount; }
    public String getToAccount() { return toAccount; }
    public BigDecimal getAmount() { return amount; }
    public TransactionType getType() { return type; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getDescription() { return description; }
    public TransactionStatus getStatus() { return status; }
    
    public void setStatus(TransactionStatus status) {
        this.status = status;
    }
    
    @Override
    public String toString() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return String.format("Transaction{id='%s', type=%s, amount=$%.2f, status=%s, time=%s}",
                transactionId, type, amount, status, timestamp.format(formatter));
    }
}

/**
 * Main banking system class that handles all banking operations
 */
public class BankingSystem {
    private final Map<String, Account> accounts;
    private final List<Transaction> transactionHistory;
    private final SecureRandom random;
    private final ReentrantLock systemLock;
    
    // Configuration constants
    private static final BigDecimal MIN_BALANCE = new BigDecimal("0.00");
    private static final BigDecimal OVERDRAFT_LIMIT = new BigDecimal("-500.00");
    private static final BigDecimal TRANSFER_FEE = new BigDecimal("2.50");
    private static final BigDecimal DAILY_WITHDRAWAL_LIMIT = new BigDecimal("1000.00");
    
    // Validation patterns
    private static final Pattern ACCOUNT_NUMBER_PATTERN = Pattern.compile("^\\d{10}$");
    private static final Pattern CUSTOMER_ID_PATTERN = Pattern.compile("^[A-Z]{2}\\d{8}$");
    
    public BankingSystem() {
        this.accounts = new ConcurrentHashMap<>();
        this.transactionHistory = Collections.synchronizedList(new ArrayList<>());
        this.random = new SecureRandom();
        this.systemLock = new ReentrantLock();
    }
    
    /**
     * Creates a new bank account
     */
    public String createAccount(String customerName, String customerId, 
                               Account.AccountType type, BigDecimal initialDeposit) {
        if (customerName == null || customerName.trim().isEmpty()) {
            throw new IllegalArgumentException("Customer name cannot be empty");
        }
        
        if (!CUSTOMER_ID_PATTERN.matcher(customerId).matches()) {
            throw new IllegalArgumentException("Invalid customer ID format");
        }
        
        if (initialDeposit.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Initial deposit cannot be negative");
        }
        
        String accountNumber = generateAccountNumber();
        Account account = new Account(accountNumber, customerName, customerId, type, initialDeposit);
        
        systemLock.lock();
        try {
            accounts.put(accountNumber, account);
            
            // Record initial deposit transaction
            if (initialDeposit.compareTo(BigDecimal.ZERO) > 0) {
                Transaction depositTransaction = new Transaction(
                    generateTransactionId(),
                    null,
                    accountNumber,
                    initialDeposit,
                    Transaction.TransactionType.DEPOSIT,
                    "Initial deposit"
                );
                depositTransaction.setStatus(Transaction.TransactionStatus.COMPLETED);
                transactionHistory.add(depositTransaction);
            }
            
            return accountNumber;
        } finally {
            systemLock.unlock();
        }
    }
    
    /**
     * Processes a deposit to an account
     */
    public boolean deposit(String accountNumber, BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive");
        }
        
        Account account = accounts.get(accountNumber);
        if (account == null || !account.isActive()) {
            return false;
        }
        
        account.getLock().lock();
        try {
            BigDecimal newBalance = account.getBalance().add(amount);
            account.setBalance(newBalance);
            
            Transaction transaction = new Transaction(
                generateTransactionId(),
                null,
                accountNumber,
                amount,
                Transaction.TransactionType.DEPOSIT,
                description != null ? description : "Deposit"
            );
            transaction.setStatus(Transaction.TransactionStatus.COMPLETED);
            transactionHistory.add(transaction);
            
            return true;
        } finally {
            account.getLock().unlock();
        }
    }
    
    /**
     * Processes a withdrawal from an account
     */
    public boolean withdraw(String accountNumber, BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be positive");
        }
        
        Account account = accounts.get(accountNumber);
        if (account == null || !account.isActive()) {
            return false;
        }
        
        account.getLock().lock();
        try {
            BigDecimal currentBalance = account.getBalance();
            BigDecimal newBalance = currentBalance.subtract(amount);
            
            // Check withdrawal limits
            if (!canWithdraw(account, amount)) {
                return false;
            }
            
            account.setBalance(newBalance);
            
            Transaction transaction = new Transaction(
                generateTransactionId(),
                accountNumber,
                null,
                amount,
                Transaction.TransactionType.WITHDRAWAL,
                description != null ? description : "Withdrawal"
            );
            transaction.setStatus(Transaction.TransactionStatus.COMPLETED);
            transactionHistory.add(transaction);
            
            return true;
        } finally {
            account.getLock().unlock();
        }
    }
    
    /**
     * Transfers money between two accounts
     */
    public boolean transfer(String fromAccountNumber, String toAccountNumber, 
                           BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be positive");
        }
        
        if (fromAccountNumber.equals(toAccountNumber)) {
            throw new IllegalArgumentException("Cannot transfer to the same account");
        }
        
        Account fromAccount = accounts.get(fromAccountNumber);
        Account toAccount = accounts.get(toAccountNumber);
        
        if (fromAccount == null || !fromAccount.isActive() ||
            toAccount == null || !toAccount.isActive()) {
            return false;
        }
        
        // Lock accounts in a consistent order to prevent deadlocks
        Account firstLock = fromAccountNumber.compareTo(toAccountNumber) < 0 ? fromAccount : toAccount;
        Account secondLock = fromAccountNumber.compareTo(toAccountNumber) < 0 ? toAccount : fromAccount;
        
        firstLock.getLock().lock();
        try {
            secondLock.getLock().lock();
            try {
                BigDecimal totalAmount = amount.add(TRANSFER_FEE);
                
                if (!canWithdraw(fromAccount, totalAmount)) {
                    return false;
                }
                
                // Process the transfer
                fromAccount.setBalance(fromAccount.getBalance().subtract(totalAmount));
                toAccount.setBalance(toAccount.getBalance().add(amount));
                
                // Record transfer transaction
                Transaction transferTransaction = new Transaction(
                    generateTransactionId(),
                    fromAccountNumber,
                    toAccountNumber,
                    amount,
                    Transaction.TransactionType.TRANSFER,
                    description != null ? description : "Transfer"
                );
                transferTransaction.setStatus(Transaction.TransactionStatus.COMPLETED);
                transactionHistory.add(transferTransaction);
                
                // Record fee transaction if applicable
                if (TRANSFER_FEE.compareTo(BigDecimal.ZERO) > 0) {
                    Transaction feeTransaction = new Transaction(
                        generateTransactionId(),
                        fromAccountNumber,
                        null,
                        TRANSFER_FEE,
                        Transaction.TransactionType.FEE,
                        "Transfer fee"
                    );
                    feeTransaction.setStatus(Transaction.TransactionStatus.COMPLETED);
                    transactionHistory.add(feeTransaction);
                }
                
                return true;
            } finally {
                secondLock.getLock().unlock();
            }
        } finally {
            firstLock.getLock().unlock();
        }
    }
    
    /**
     * Gets account information
     */
    public Account getAccount(String accountNumber) {
        return accounts.get(accountNumber);
    }
    
    /**
     * Gets transaction history for an account
     */
    public List<Transaction> getTransactionHistory(String accountNumber) {
        return transactionHistory.stream()
            .filter(t -> accountNumber.equals(t.getFromAccount()) || 
                        accountNumber.equals(t.getToAccount()))
            .sorted((t1, t2) -> t2.getTimestamp().compareTo(t1.getTimestamp()))
            .toList();
    }
    
    /**
     * Gets all accounts for a customer
     */
    public List<Account> getCustomerAccounts(String customerId) {
        return accounts.values().stream()
            .filter(account -> customerId.equals(account.getCustomerId()))
            .sorted((a1, a2) -> a1.getCreatedAt().compareTo(a2.getCreatedAt()))
            .toList();
    }
    
    /**
     * Calculates total balance across all customer accounts
     */
    public BigDecimal getTotalCustomerBalance(String customerId) {
        return getCustomerAccounts(customerId).stream()
            .filter(Account::isActive)
            .map(Account::getBalance)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    /**
     * Closes an account (sets it as inactive)
     */
    public boolean closeAccount(String accountNumber) {
        Account account = accounts.get(accountNumber);
        if (account == null) {
            return false;
        }
        
        account.getLock().lock();
        try {
            if (account.getBalance().compareTo(BigDecimal.ZERO) != 0) {
                throw new IllegalStateException("Cannot close account with non-zero balance");
            }
            
            account.setActive(false);
            return true;
        } finally {
            account.getLock().unlock();
        }
    }
    
    // Helper methods
    
    private boolean canWithdraw(Account account, BigDecimal amount) {
        BigDecimal newBalance = account.getBalance().subtract(amount);
        
        // Check minimum balance based on account type
        BigDecimal minAllowedBalance = account.getType() == Account.AccountType.CHECKING 
            ? OVERDRAFT_LIMIT : MIN_BALANCE;
        
        if (newBalance.compareTo(minAllowedBalance) < 0) {
            return false;
        }
        
        // Check daily withdrawal limit
        BigDecimal todayWithdrawals = getTodayWithdrawals(account.getAccountNumber());
        if (todayWithdrawals.add(amount).compareTo(DAILY_WITHDRAWAL_LIMIT) > 0) {
            return false;
        }
        
        return true;
    }
    
    private BigDecimal getTodayWithdrawals(String accountNumber) {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        
        return transactionHistory.stream()
            .filter(t -> accountNumber.equals(t.getFromAccount()))
            .filter(t -> t.getTimestamp().isAfter(startOfDay))
            .filter(t -> t.getType() == Transaction.TransactionType.WITHDRAWAL ||
                        t.getType() == Transaction.TransactionType.TRANSFER)
            .filter(t -> t.getStatus() == Transaction.TransactionStatus.COMPLETED)
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    private String generateAccountNumber() {
        String accountNumber;
        do {
            accountNumber = String.format("%010d", random.nextInt(1000000000));
        } while (accounts.containsKey(accountNumber));
        return accountNumber;
    }
    
    private String generateTransactionId() {
        return "TXN" + System.currentTimeMillis() + random.nextInt(1000);
    }
    
    /**
     * Demo method for testing the banking system
     */
    public static void main(String[] args) {
        BankingSystem bank = new BankingSystem();
        
        try {
            // Create test accounts
            String account1 = bank.createAccount("John Doe", "US12345678", 
                Account.AccountType.CHECKING, new BigDecimal("1000.00"));
            String account2 = bank.createAccount("Jane Smith", "US87654321", 
                Account.AccountType.SAVINGS, new BigDecimal("500.00"));
            
            System.out.println("Created accounts:");
            System.out.println(bank.getAccount(account1));
            System.out.println(bank.getAccount(account2));
            
            // Test deposit
            bank.deposit(account1, new BigDecimal("250.00"), "Salary deposit");
            System.out.println("\nAfter deposit:");
            System.out.println(bank.getAccount(account1));
            
            // Test withdrawal
            bank.withdraw(account1, new BigDecimal("100.00"), "ATM withdrawal");
            System.out.println("\nAfter withdrawal:");
            System.out.println(bank.getAccount(account1));
            
            // Test transfer
            bank.transfer(account1, account2, new BigDecimal("200.00"), "Payment to Jane");
            System.out.println("\nAfter transfer:");
            System.out.println(bank.getAccount(account1));
            System.out.println(bank.getAccount(account2));
            
            // Show transaction history
            System.out.println("\nTransaction history for " + account1 + ":");
            bank.getTransactionHistory(account1).forEach(System.out::println);
            
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
