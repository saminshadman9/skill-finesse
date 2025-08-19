# SSLCOMMERZ Live Environment Integration

Please check the attached documentation to implement connectivity with the new SSLCOMMERZ system. We highly appreciate if you first connect with the testbox and then move to the live environment. If you need to change the **Registered Store URL** for the testbox, please let us know.

Briefly, there are only three steps to establish connectivity between your Merchant Site and SSLCOMMERZ:

---

## 1. Create a Transaction Session

Use the SSLCommerz Session API to initiate a transaction session.

- **Method:** HTTP POST
- **Parameters:** See **Ready the parameters** on the [developer page](https://developer.sslcommerz.com/).
- **Response:** JSON containing the customer redirection URL.
- **Redirect URL Field:** `GatewayPageURL`

---

## 2. Set Up an IPN Listener

Create an Instant Payment Notification (IPN) listener to receive payment notifications.

- **Method:** HTTP POST
- **Parameters:** See **Validate Payment with IPN** on the [developer page](https://developer.sslcommerz.com/).
- **Configuration:** In the **SSLCommerz Merchant Panel** under **Menu > My Store > IPN Settings**.
- **Validation:** After receiving the IPN payload, call the **SSLCommerz Validation API** to verify it.
- **Possible Statuses:** `VALID`, `FAILED`, `CANCELLED`
- **Risk Handling:** If `risk_level = 1` and status is `VALID`, hold the transaction and verify the customer.
- **Final Status:** Once validation completes, status returns as `VALIDATED`.

---

## 3. Redirect to Your Callback URL

SSLCOMMERZ will redirect the customer to the callback URL you provided (success, failure, or cancellation) when creating the session.

---

## Access Credentials

**Merchant URL:** [https://merchant.sslcommerz.com/](https://merchant.sslcommerz.com/)

**Merchant Name:** home academy bd

### Store Information

| Item                         | Details                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| **Store Name**               | SSLCOMMERZ                                                                                       |
| **Transaction Session API**  | `https://securepay.sslcommerz.com/gwprocess/v4/api.php`                                          |
| **Validation URL (SOAP)**    | `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?wsdl`                    |
| **Validation URL (REST)**    | `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php`                         |
| **Store ID**                 | `skillfinesse0live` *(required for redirection & validation)*                                    |
| **Store Password**           | `6832CA5EDAA6856122` *(required for validation — no change needed)*                               |
| **Registered Store URL**     | `https://skillfinesse.com/`                                                                      |
| **Developer Page**           | [https://developer.sslcommerz.com/](https://developer.sslcommerz.com/)                            |

---

*End of document.*

