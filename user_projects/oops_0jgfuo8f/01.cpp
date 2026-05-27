#include <cstring>
#include <iostream>
using namespace std;

class Book {
 private:
  char* title;

 public:
  // constructor
  Book(const char* x) {
    title = new char[strlen(x) + 1];
    strcpy(title, x);
  }
  // copy constructor
  Book(const Book& obj) {
    title = new char[strlen(obj.title) + 1];
    strcpy(title, obj.title);
  }
  void show() {
    cout << "Title: " << title << endl;
  }
};

int main() {
  Book B1("Sex Basics");
  Book B2 = B1;
  B2.show();
  B1.show();
  return 0;
}