#include <iostream>
#include <cstring>
using namespace std;

class Employee {
private:
    char* name;
    int salary;

public:

    // Constructor
    Employee(const char* n, int s) {
        salary = s;

        name = new char[strlen(n) + 1];
        strcpy(name, n);
    }

    // Deep Copy Constructor
    Employee(const Employee& obj) {

        salary = obj.salary;

        name = new char[strlen(obj.name) + 1];
        strcpy(name, obj.name);
    }

    // Setter
    void setSalary(int s) {
        if (s < 0)
            salary = 0;
        else
            salary = s;
    }

    // Getter
    int getSalary() {
        return salary;
    }

    void showName() {
        cout << "Name: " << name << endl;
    }

    // Destructor
    ~Employee() {
        delete[] name;
        cout << "Memory released!" << endl;
    }
};

int main() {

    Employee e1("Hasnain", 120000);

    Employee e2 = e1;

    e2.setSalary(100000);

    cout << "e1 Salary: " << e1.getSalary() << endl;
    cout << "e2 Salary: " << e2.getSalary() << endl;

    e1.showName();
    e2.showName();

    return 0;
}