import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

/*
 * =========================================================
 * SMART TRANSPORTATION MANAGEMENT SYSTEM
 * Refactored with Factory Method Design Pattern
 * =========================================================
 */

/* =========================================================
 * PRODUCT INTERFACE
 * =========================================================
 */
interface Vehicle {
    void startTrip();
    double calculateFare(double distance);
    void assignRoute(String route);
    void getVehicleInfo();
    String getVehicleType();
}

/* =========================================================
 * CONCRETE PRODUCTS (unchanged logic, same as before)
 * =========================================================
 */

class Bus implements Vehicle {
    private final int capacity = 40;
    private final double farePerKm = 15;
    private String route;

    @Override
    public void startTrip() {
        System.out.println("Bus trip started.");
    }

    @Override
    public double calculateFare(double distance) {
        return distance * farePerKm;
    }

    @Override
    public void assignRoute(String route) {
        this.route = route;
        System.out.println("Bus assigned to route: " + route);
    }

    @Override
    public void getVehicleInfo() {
        System.out.println("Vehicle: Bus");
        System.out.println("Capacity: " + capacity);
        System.out.println("Fare per KM: " + farePerKm);
    }

    @Override
    public String getVehicleType() {
        return "Bus";
    }
}

class Taxi implements Vehicle {
    private final int capacity = 4;
    private final double farePerKm = 30;
    private String route;

    @Override
    public void startTrip() {
        System.out.println("Taxi trip started.");
    }

    @Override
    public double calculateFare(double distance) {
        return distance * farePerKm;
    }

    @Override
    public void assignRoute(String route) {
        this.route = route;
        System.out.println("Taxi assigned to route: " + route);
    }

    @Override
    public void getVehicleInfo() {
        System.out.println("Vehicle: Taxi");
        System.out.println("Capacity: " + capacity);
        System.out.println("Fare per KM: " + farePerKm);
    }

    @Override
    public String getVehicleType() {
        return "Taxi";
    }
}

class MotorcycleDelivery implements Vehicle {
    private final int capacity = 1;
    private final double farePerKm = 10;
    private String route;

    @Override
    public void startTrip() {
        System.out.println("Motorcycle delivery started.");
    }

    @Override
    public double calculateFare(double distance) {
        return distance * farePerKm;
    }

    @Override
    public void assignRoute(String route) {
        this.route = route;
        System.out.println("Motorcycle assigned to route: " + route);
    }

    @Override
    public void getVehicleInfo() {
        System.out.println("Vehicle: Motorcycle Delivery");
        System.out.println("Capacity: " + capacity);
        System.out.println("Fare per KM: " + farePerKm);
    }

    @Override
    public String getVehicleType() {
        return "Motorcycle Delivery";
    }
}

class ElectricScooter implements Vehicle {
    private final int capacity = 1;
    private final double farePerKm = 8;
    private String route;

    @Override
    public void startTrip() {
        System.out.println("Electric scooter trip started.");
    }

    @Override
    public double calculateFare(double distance) {
        return distance * farePerKm;
    }

    @Override
    public void assignRoute(String route) {
        this.route = route;
        System.out.println("Scooter assigned to route: " + route);
    }

    @Override
    public void getVehicleInfo() {
        System.out.println("Vehicle: Electric Scooter");
        System.out.println("Capacity: " + capacity);
        System.out.println("Fare per KM: " + farePerKm);
    }

    @Override
    public String getVehicleType() {
        return "Electric Scooter";
    }
}

/* =========================================================
 * ABSTRACT CREATOR  — the Factory Method lives here
 *
 * The abstract method createVehicle() is the "factory method".
 * Each subclass decides WHICH concrete Vehicle to instantiate.
 * The rest of the logic (assignRoute, startTrip, etc.) is
 * written once here and reused by every concrete factory.
 * =========================================================
 */
abstract class VehicleFactory {

    // ---- FACTORY METHOD (must be overridden by each subclass) ----
    public abstract Vehicle createVehicle();

    // ---- TEMPLATE OPERATIONS (shared business logic) ----

    public void prepareAndStartTrip(String route) {
        Vehicle vehicle = createVehicle();      // polymorphic creation
        vehicle.getVehicleInfo();
        vehicle.assignRoute(route);
        vehicle.startTrip();
        System.out.println();
    }

    public double getFare(double distance) {
        Vehicle vehicle = createVehicle();
        return vehicle.calculateFare(distance);
    }
}

/* =========================================================
 * CONCRETE CREATORS
 * Each class overrides createVehicle() to return its product.
 * Adding a new vehicle = adding ONE new class, nothing else.
 * =========================================================
 */

class BusFactory extends VehicleFactory {
    @Override
    public Vehicle createVehicle() {
        return new Bus();
    }
}

class TaxiFactory extends VehicleFactory {
    @Override
    public Vehicle createVehicle() {
        return new Taxi();
    }
}

class MotorcycleDeliveryFactory extends VehicleFactory {
    @Override
    public Vehicle createVehicle() {
        return new MotorcycleDelivery();
    }
}

class ElectricScooterFactory extends VehicleFactory {
    @Override
    public Vehicle createVehicle() {
        return new ElectricScooter();
    }
}

/* =========================================================
 * FACTORY REGISTRY  — maps user input to the right factory
 *
 * The client never calls  new Bus()  or  new Taxi()  directly.
 * It asks the registry for a factory, then delegates creation.
 * =========================================================
 */
class VehicleFactoryRegistry {

    public static VehicleFactory getFactory(String type) {
        switch (type.toLowerCase()) {
            case "bus":                  return new BusFactory();
            case "taxi":                 return new TaxiFactory();
            case "motorcycle":           return new MotorcycleDeliveryFactory();
            case "electricscooter":      return new ElectricScooterFactory();
            default:
                throw new IllegalArgumentException(
                    "Unknown vehicle type: " + type +
                    "\nValid types: bus, taxi, motorcycle, electricscooter"
                );
        }
    }
}

/* =========================================================
 * CLIENT / MAIN
 * =========================================================
 */
public class Solution {

    public static void main(String[] args) {

        System.out.println("=================================================");
        System.out.println("  SMART TRANSPORTATION MANAGEMENT SYSTEM");
        System.out.println("  (Factory Method Pattern Demo)");
        System.out.println("=================================================\n");

        // ------------------------------------------------------------------
        // 1. Demonstrate every vehicle type via the factory
        // ------------------------------------------------------------------
        String[] vehicleTypes = { "bus", "taxi", "motorcycle", "electricscooter" };
        String[] routes       = { "Route-A (City Center)", "Route-B (Airport)",
                                  "Route-C (Suburb)", "Route-D (Campus)" };
        double   testDistance = 12.5;

        for (int i = 0; i < vehicleTypes.length; i++) {
            VehicleFactory factory = VehicleFactoryRegistry.getFactory(vehicleTypes[i]);

            System.out.println("-------------------------------------------------");
            factory.prepareAndStartTrip(routes[i]);

            double fare = factory.getFare(testDistance);
            System.out.printf("Fare for %.1f km: BDT %.2f%n%n", testDistance, fare);
        }

        // ------------------------------------------------------------------
        // 2. Prove the client code never uses 'new Bus()' etc.
        //    The factory decides what to instantiate.
        // ------------------------------------------------------------------
        System.out.println("=================================================");
        System.out.println("  DYNAMIC SELECTION (simulates real-time dispatch)");
        System.out.println("=================================================");

        List<String> dispatchQueue = new ArrayList<>();
        dispatchQueue.add("bus");
        dispatchQueue.add("taxi");
        dispatchQueue.add("electricscooter");
        dispatchQueue.add("motorcycle");

        for (String type : dispatchQueue) {
            VehicleFactory factory = VehicleFactoryRegistry.getFactory(type);
            Vehicle vehicle = factory.createVehicle();
            System.out.printf("Dispatching %-20s | Fare for 5 km: BDT %.2f%n",
                vehicle.getVehicleType(), vehicle.calculateFare(5));
        }

        System.out.println("\n✅ All vehicles created through Factory Method — no direct 'new' calls in client.");
    }
}