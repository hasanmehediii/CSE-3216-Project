# Refactoring Report — Smart Transportation Management System

## Factory Method Design Pattern

---

## 1. Problems in the Previous Implementation

### ❌ Problem 1: No Separation of Creation Logic from Client Code

In the original code, the client (main method or any calling code) was directly responsible for deciding **which class to instantiate** using `new` keyword:

```java
// What the original client code would look like
Vehicle v = new Bus();
Vehicle v = new Taxi();
Vehicle v = new MotorcycleDelivery();
```

This means the **object creation logic is tightly coupled with business logic**. The client must know every concrete class that exists, which breaks the principle of coding to an interface.

---

### ❌ Problem 2: Violates the Open/Closed Principle

The original design is **closed for extension but open for modification**.

If a new vehicle (e.g., `Rickshaw`, `Ambulance`) needs to be added, the developer must:
- Create the new class
- Then go back and **modify every place** in the codebase that creates vehicles (if-else chains, switch statements scattered across the project)

This makes the system fragile — one wrong edit can break existing functionality.

---

### ❌ Problem 3: No Centralized Object Creation Point

The original code had **no single place** responsible for creating vehicles. Any class anywhere could do:

```java
new Bus();
new Taxi();
```

This makes it impossible to:
- Track how many vehicles were created
- Apply common configuration on creation
- Swap an implementation globally

---

### ❌ Problem 4: Poor Scalability

As the system grows (10, 20 vehicle types), the original design forces scattered `if-else` or `switch` blocks across the codebase. Every new developer must understand all vehicle types just to add one more.

---

### ❌ Problem 5: Code Duplication Risk

Without a shared abstract creator, each piece of client code that calls `startTrip`, `assignRoute`, etc. must repeat the same sequence of calls. There is no shared template for the workflow.

---

## 2. The New Implementation (Factory Method Pattern)

### Structure

```
VehicleFactory  (Abstract Creator)
│
├── BusFactory               → creates Bus
├── TaxiFactory              → creates Taxi
├── MotorcycleDeliveryFactory → creates MotorcycleDelivery
└── ElectricScooterFactory   → creates ElectricScooter

VehicleFactoryRegistry       → maps string input to the right factory
```

### How the Factory Method Works

The abstract class `VehicleFactory` defines the **factory method**:

```java
public abstract Vehicle createVehicle();  // factory method
```

Each concrete factory **overrides** this method to return its specific product:

```java
class BusFactory extends VehicleFactory {
    @Override
    public Vehicle createVehicle() {
        return new Bus();   // only this class knows about Bus
    }
}
```

The client never calls `new Bus()` — it only talks to `VehicleFactory`:

```java
VehicleFactory factory = VehicleFactoryRegistry.getFactory("bus");
factory.prepareAndStartTrip("Route-A");
```

---

## 3. Why Factory Method is the Right Pattern Here

| Criterion | Previous Design | Factory Method |
|---|---|---|
| Adding new vehicle | Modify client code everywhere | Add ONE new factory class |
| Client knows concrete classes? | ✅ Yes (tightly coupled) | ❌ No (decoupled) |
| Creation logic centralized? | ❌ No | ✅ Yes (registry + factory) |
| Follows Open/Closed Principle? | ❌ No | ✅ Yes |
| Shared workflow possible? | ❌ No | ✅ Yes (in abstract creator) |
| Testability | Hard (must mock concrete class) | Easy (mock the factory) |

---

## 4. Benefits Gained

### ✅ Single Responsibility
Each factory class has exactly one job — create its vehicle. Business logic stays in `VehicleFactory` base class.

### ✅ Open/Closed Principle
To add `Rickshaw` tomorrow:
1. Create `Rickshaw` class implementing `Vehicle`
2. Create `RickshawFactory` extending `VehicleFactory`
3. Add `"rickshaw"` case to `VehicleFactoryRegistry`

**Zero changes to existing code.**

### ✅ Decoupled Client
The client only depends on `VehicleFactory` (abstract) and `Vehicle` (interface). It never imports or references `Bus`, `Taxi`, etc.

### ✅ Shared Template Logic
`prepareAndStartTrip()` is written **once** in the abstract creator and works for every vehicle type — no duplication.

### ✅ Centralized Registry
`VehicleFactoryRegistry` is the single source of truth for which string maps to which factory. Easy to maintain, easy to extend.

---

## 5. Summary

The original code was a **quick prototype** — it worked, but it mixed creation logic with usage logic and provided no structure for growth. The Factory Method pattern separates these concerns cleanly:

> **"Define an interface for creating an object, but let subclasses decide which class to instantiate."**
> — Gang of Four

This makes the Smart Transportation System ready to scale from 4 vehicles to 40 without touching existing, tested code.