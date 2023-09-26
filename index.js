const express = require("express")
const cors = require("cors")

const { connectToDb, disconnectDb } = require("./database")
const ParentProduct = require("./schema/parentProduct")
const SingleVariation = require("./schema/singleVariation")
const Order = require("./schema/order")
const { connect } = require("mongoose")

const stripe = require("stripe")()


const app = express()

app.use(express.json())
app.use(cors())



// when asked for all catagories 
app.get("/catagory", async (req, res) => {
    connectToDb()

    const product = await ParentProduct.find()
    res.json(product)

})

// when creating parent model 
app.post("/catagory", async (req, res) => {
    connectToDb()

    const { modelName, description, images } = req.body;

    try {
        const newProduct = new ParentProduct({ modelName, description, images })
        await newProduct.save()
        res.status(201).json(newProduct)

    } catch (error) {
        res.status(500).json({ error: "can't find the product" })
    }
})

// edit catagory 
app.patch("/catagory/:id", (req, res) => {
    connectToDb()
    const id = req.params.id
    const update = req.body;

    ParentProduct.findByIdAndUpdate(id, update)
        .then(result => res.status(200).json(result))
        .catch(error => console.log(error))
})

//delete a catagory

app.delete("/catagory/:id", (req, res) => {
    connectToDb()
    const id = req.params.id
    ParentProduct.findByIdAndDelete(id)
        .then(result => res.status(200).json(result))
        .catch(error => console.log(error))
})


// this part is for product 
// get all products
app.get("/product", async (req, res) => {
    connectToDb()
    const allProduct = await SingleVariation.find()
    res.json(allProduct)
})

//get single product
app.get("/product/:id", async (req, res) => {
    try {
        connectToDb()
        const id = req.params.id

        const product = await SingleVariation.findById(id)
        res.status(200).json(product)
    } catch {
        console.log("error in produt/:id get *** : ", error)
    }
})
//get first n products, ex: 12 with skip: 0
app.get("/products/:n/:skip", async (req, res) => {
    try {
        connectToDb()
        const n = req.params.n
        const skip = req.params.skip

        const products = await SingleVariation.find().skip(skip).limit(n)

        res.json(products)

    } catch { error => console.log(error) }
})

//make a product
app.post("/product", async (req, res) => {
    connectToDb()

    let product = req.body

    const newProduct = new SingleVariation(product)

    await newProduct.save()

    res.status(200).json(newProduct)
})

// edit product 
app.patch("/product/:id", (req, res) => {
    connectToDb()
    const id = req.params.id
    const update = req.body;

    SingleVariation.findByIdAndUpdate(id, update)
        .then(result => res.status(200).json(result))
        .catch(error => console.log(error))
})

app.delete("/product/:id", (req, res) => {
    connectToDb()
    const id = req.params.id

    SingleVariation.findByIdAndDelete(id)
        .then(result => res.status(200).json(result))
        .catch(error => console.log("product delete error: ***: ", error))
})




// get cart products form front end 
app.post("/cart", async (req, res) => {
    try {
        connectToDb()
        const { ids } = req.body
        const products = await SingleVariation.find({ _id: ids })
        res.status(200).json(products)
    } catch (error) {
        console.log(error)
        res.status(500).json("error form /cart *** ", error)
    }
})

app.post("/checkout-customer", async (req, res) => {
    try {
        connectToDb()
        const { name, email, phone, city, postal, street, country, orders, shipping } = req.body
        console.log({ name, email, phone, city, postal, street, country, orders, shipping })
        const uniqueOrders = [...new Set(orders)]
        const productsInfo = await SingleVariation.find({ _id: uniqueOrders })

        let line_items = []

        for (const id of uniqueOrders) {
            const info = productsInfo.find(p => p._id.toString() === id)
            const quantity = orders.filter(i => i === id)?.length || 0

            if (quantity > 0 && productsInfo) {
                line_items.push({
                    quantity,
                    price_data: {
                        currency: "USD",
                        unit_amount: quantity * info?.price * 100,
                        product_data: { name: info?.productName },
                    },
                    metadata: {
                        product_name: info?.productName,
                        color: info?.color?.name,
                        storage: info?.storage,
                        condition: info?.condition,
                    }
                })
            }
        }

        // adding price for shipping 
        if (shipping === "priority") {
            line_items.push({
                quantity: 1,
                price_data: {
                    currency: "USD",
                    unit_amount: 10 * 100,
                    product_data: { name: "priority shipping" }
                }
            })
        } else if (shipping === "express") {
            line_items.push({
                quantity: 1,
                price_data: {
                    currency: "USD",
                    unit_amount: 30 * 100,
                    product_data: { name: "express shipping" }
                }
            })
        }


        const order = await Order.create({
                    line_items,
                    name,
                    email,
                    phone,
                    city,
                    postal,
                    street,
                    country,
                    shipping,
                    paid: true,
                    status: "processing",
                })
        
        res.json(order)

    } catch (error) {
        console.log("error in /checkout-customer", error)
    }
})

// warining sing to unwanted route 
app.use((req, res) => {
    res.status(404).json({ error: "are you hacking ?" })
})

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log("server is running on port, ", port)
});