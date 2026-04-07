use anyhow::Result;
use keyring::Entry;

const SERVICE_NAME: &str = "diverge-desktop";

pub fn store_api_key(service: &str, key: &str) -> Result<()> {
    let entry = Entry::new(SERVICE_NAME, service)?;
    entry.set_password(key)?;
    Ok(())
}

pub fn get_api_key(service: &str) -> Result<Option<String>> {
    let entry = Entry::new(SERVICE_NAME, service)?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}
