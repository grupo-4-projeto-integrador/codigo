package main

import "fmt"

type Apolice struct {
	Status string
}

func main() {
	items := []Apolice{{Status: "old"}, {Status: "old"}}
	for i := range items {
		items[i].Status = "new"
	}
	fmt.Println(items)
}
